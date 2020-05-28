import { Page, Pages } from '../types';
import * as Bacon from 'baconjs';

interface SearchResult {
    page: Page;
    query: string;
    matches: string[] | undefined;
}

interface Sidebar {
    element: HTMLElement;
}

export function makeSidebar(pages$: Bacon.Observable<Pages>): Sidebar {
    // Elements

    const $pageList = document.createElement('ul');
    $pageList.classList.add('sidebar__list');

    const $input = document.createElement('input');
    $input.setAttribute('placeholder', 'Search');

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

    const $sidebar = document.createElement('div');
    $sidebar.classList.add('sidebar');
    $sidebar.appendChild($form);
    $sidebar.appendChild($pageList);

    // Observables

    const query$ = Bacon.fromBinder<string>((sink) => {
        $input.addEventListener('input', () => {
            sink($input.value);
        });
        sink('');
        return (): undefined => undefined;
    });
    const results$ = Bacon.combine(query$, pages$, (query: string, pages: Pages): SearchResult[] => {
        return pages
            .map((page) => matchPage(page, query))
            .filter((result) => result.matches !== undefined)
            .sort(resultSort);
    });
    results$.onValue((results) => {
        const $fragment = document.createDocumentFragment();
        for (const result of results) {
            $fragment.appendChild(makePageListItem(result));
        }
        $pageList.innerHTML = '';
        $pageList.appendChild($fragment);
    });

    // Result

    return {
        element: $sidebar,
    };
}

function resultSort(a: SearchResult, b: SearchResult): number {
    const aIsDate = a.page.title.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
    const bIsDate = b.page.title.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
    if (aIsDate && bIsDate) {
        return b.page.title.localeCompare(a.page.title);
    } else if (aIsDate && !bIsDate) {
        return -1;
    } else if (!aIsDate && bIsDate) {
        return 1;
    } else {
        return a.page.title.localeCompare(b.page.title);
    }
}

function makePageListItem(result: SearchResult): HTMLLIElement {
    const $link = document.createElement('a');
    $link.setAttribute('href', result.page.id);
    $link.classList.add('internal');
    $link.innerText = result.page.title;

    const $matches = document.createElement('ul');
    for (const match of result.matches || []) {
        const $match = document.createElement('li');
        $match.classList.add('search-result__match');
        const idx = match.toLowerCase().indexOf(result.query.toLowerCase());
        $match.appendChild(document.createTextNode(match.substring(0, idx)));
        const $mark = document.createElement('mark');
        $mark.innerText = match.substring(idx, idx + result.query.length);
        $match.appendChild($mark);
        $match.appendChild(document.createTextNode(match.substring(idx + result.query.length)));
        $matches.appendChild($match);
    }

    const $item = document.createElement('li');
    $item.classList.add('search-result');
    $item.appendChild($link);
    $item.appendChild($matches);

    return $item;
}

function matchPage(page: Page, query: string): SearchResult {
    const matches = page.searchable.filter((line) => line.toLowerCase().includes(query.toLowerCase()));
    return {
        page,
        query,
        matches:
            query === ''
                ? []
                : matches.length > 0 || page.title.toLowerCase().includes(query.toLowerCase())
                ? matches
                : undefined,
    };
}
