import { Page } from '../Page';
import { PageRepository } from '../PageRepository';

interface SearchResult {
    url: string;
    title: string;
    matches: string[];
}

export class SidebarView {
    public readonly $element: HTMLDivElement;
    private readonly $pageList: HTMLUListElement;
    private query: string = '';

    constructor(private readonly pageRepository: PageRepository) {
        this.$pageList = document.createElement('ul');
        this.$pageList.classList.add('sidebar__list');

        const $input = document.createElement('input');
        $input.setAttribute('placeholder', 'Search');
        $input.addEventListener('input', () => {
            this.query = $input.value;
            this.updateResults();
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
        this.$element.appendChild(this.$pageList);

        pageRepository.addPagesListener(() => this.updateResults());
    }

    private updateResults(): void {
        const results = this.pageRepository
            .getAllPages()
            .filter((page) => page.getTitle().toLowerCase().includes(this.query.toLowerCase()))
            .map((page) => ({
                title: page.getTitle(),
                url: page.id,
                matches: [],
            }))
            .sort(this.compareResults);

        const $fragment = document.createDocumentFragment();
        for (const result of results) {
            $fragment.appendChild(this.renderResult(result));
        }
        this.$pageList.innerHTML = '';
        this.$pageList.appendChild($fragment);
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
