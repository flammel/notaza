import { PageRepository } from '../PageRepository';
import { Page, Block } from '../Page';

interface SearchResult {
    url: string;
    title: string;
    matches: string[];
    titleMatch: boolean;
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

        pageRepository.pagesLoaded$.subscribe(() => this.updateResults());
    }

    private searchInPage(page: Page, query: string): SearchResult | undefined {
        const matchingBlocks: Block[] = page
            .getFlatBlocks()
            .filter((block) => query !== '' && block.getContent().toLowerCase().includes(query.toLowerCase()));

        const titleMatch = page.getTitle().toLowerCase().includes(query.toLowerCase());
        if (matchingBlocks.length > 0 || titleMatch) {
            return {
                url: page.id,
                title: page.getTitle(),
                titleMatch,
                matches: matchingBlocks.map((block) => block.getContent()),
            };
        }
    }

    private highlight(text: string, query: string): string {
        if (query.length === 0) {
            return text;
        }
        const index = text.toLowerCase().indexOf(query.toLowerCase());
        if (index < 0) {
            return text;
        }
        return (
            text.substring(0, index) +
            '<mark>' +
            text.substring(index, index + query.length) +
            '</mark>' +
            this.highlight(text.substring(index + query.length), query)
        );
    }

    private updateResults(): void {
        const results = this.pageRepository
            .getAllPages()
            .map((page) => this.searchInPage(page, this.query))
            .sort((a, b) => this.compareResults(a, b));
        const $fragment = document.createDocumentFragment();
        for (const result of results) {
            if (result !== undefined) {
                $fragment.appendChild(this.renderResult(result));
            }
        }
        this.$pageList.innerHTML = '';
        this.$pageList.appendChild($fragment);
    }

    private compareResults(a: SearchResult | undefined, b: SearchResult | undefined): number {
        if (a === undefined) {
            return b === undefined ? 0 : -1;
        }
        if (b === undefined) {
            return a === undefined ? 0 : 1;
        }
        if (a.titleMatch && !b.titleMatch) {
            return -1;
        }
        if (!a.titleMatch && b.titleMatch) {
            return 1;
        }
        if (a.matches.length > 0 || b.matches.length > 0) {
            return b.matches.length - a.matches.length;
        }
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
        $link.innerHTML = this.highlight(result.title, this.query);

        const $matches = document.createElement('ul');
        for (const match of result.matches || []) {
            const $match = document.createElement('li');
            $match.classList.add('search-result__match');
            $match.innerHTML = this.highlight(match, this.query);
            $matches.appendChild($match);
        }

        const $result = document.createElement('li');
        $result.classList.add('search-result');
        $result.appendChild($link);
        $result.appendChild($matches);

        return $result;
    }
}
