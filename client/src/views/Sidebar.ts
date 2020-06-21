import * as actions from '../actions';
import { Store } from '../store';
import { WrappedElement } from '../html';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

interface SearchResult {
    url: string;
    title: string;
    matches: string[];
}

export class SidebarController {
    constructor(private readonly store: Store) {}

    public onQueryChange(query: string): void {
        this.store.dispatch(actions.onQueryChange(query));
    }

    public get results$(): Observable<SearchResult[]> {
        const pages$ = this.store.state$.pipe(map((state) => state.pages));
        const query$ = this.store.state$.pipe(map((state) => state.sidebar.query));
        return combineLatest(pages$, query$, (pages, query) =>
            pages
                .filter((page) => page.title.toLowerCase().includes(query.toLowerCase()))
                .map((page) => ({
                    title: page.title,
                    url: page.id,
                    matches: [],
                }))
                .sort(this.compareResults),
        );
    }

    private compareResults(a: SearchResult, b: SearchResult): number {
        const aIsDate = a.title.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
        const bIsDate = b.title.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
        if (aIsDate && bIsDate) {
            return b.title.localeCompare(a.title);
        } else if (aIsDate && !bIsDate) {
            return -1;
        } else if (!aIsDate && bIsDate) {
            return 1;
        } else {
            return a.title.localeCompare(b.title);
        }
    }
}

export class SidebarView implements WrappedElement {
    public readonly $element: HTMLDivElement;

    constructor(controller: SidebarController) {
        const $pageList = document.createElement('ul');
        $pageList.classList.add('sidebar__list');

        const $input = document.createElement('input');
        $input.setAttribute('placeholder', 'Search');
        $input.addEventListener('input', () => {
            controller.onQueryChange($input.value);
        });

        const $today = document.createElement('a');
        $today.setAttribute('href', '/');
        $today.classList.add('internal');
        $today.innerText = 'Today';

        const $form = document.createElement('form');
        $form.classList.add('sidebar__header');
        $form.addEventListener('submit', (event) => {
            event.preventDefault();
        });
        $form.appendChild($today);
        $form.appendChild($input);

        this.$element = document.createElement('div');
        this.$element.classList.add('sidebar');
        this.$element.appendChild($form);
        this.$element.appendChild($pageList);

        controller.results$.subscribe((results) => {
            const $fragment = document.createDocumentFragment();
            for (const result of results) {
                $fragment.appendChild(this.renderResult(result));
            }
            $pageList.innerHTML = '';
            $pageList.appendChild($fragment);
        });
    }

    private renderResult(result: SearchResult): HTMLElement {
        const $link = document.createElement('a');
        $link.setAttribute('href', result.url);
        $link.classList.add('internal');
        $link.innerText = result.title;

        const $matches = document.createElement('ul');
        for (const match of result.matches || []) {
            const $match = document.createElement('li');
            $match.classList.add('search-result__match');
            $match.innerHTML = match;
            $matches.appendChild($match);
        }

        const $result = document.createElement('li');
        $result.classList.add('search-result');
        $result.appendChild($link);
        $result.appendChild($matches);

        return $result;
    }
}
