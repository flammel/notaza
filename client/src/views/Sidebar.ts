import { Page, Block } from '../types';
import { notUndefined } from '../util';

interface SearchResult {
    url: string;
    title: string;
    matches: string[];
    titleMatch: boolean;
}

function flatBlocksRec(block: Block): Block[] {
    return [block, ...block.children.flatMap(flatBlocksRec)];
}
function flatBlocks(page: Page): Block[] {
    return page.children.flatMap(flatBlocksRec);
}

function highlight(text: string, query: string): string {
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
        highlight(text.substring(index + query.length), query)
    );
}

function searchInPage(page: Page, query: string): SearchResult | undefined {
    const matchingBlocks: Block[] = flatBlocks(page).filter(
        (block) => query !== '' && block.content.toLowerCase().includes(query.toLowerCase()),
    );

    const titleMatch = page.title.toLowerCase().includes(query.toLowerCase());
    if (matchingBlocks.length > 0 || titleMatch) {
        return {
            url: page.id,
            title: highlight(page.title, query),
            titleMatch,
            matches: matchingBlocks.map((block) => highlight(block.content, query)),
        };
    }
}

function compareResults(a: SearchResult, b: SearchResult): number {
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

function getSearchResults(pages: Page[], query: string): SearchResult[] {
    return pages
        .map((page) => searchInPage(page, query))
        .filter(notUndefined)
        .sort(compareResults);
}

export class SidebarView {
    private readonly $results: HTMLUListElement;

    private pages: Page[] = [];
    private query: string = '';

    public constructor($container: HTMLElement) {
        const $sidebar = document.createElement('div');
        $sidebar.classList.add('sidebar');

        const $form = document.createElement('form');
        $form.classList.add('sidebar__header');
        $form.addEventListener('submit', (event) => event.preventDefault());

        const $today = document.createElement('a');
        $today.classList.add('internal');
        $today.setAttribute('href', '/');
        $today.innerText = 'Today';

        const $search = document.createElement('input');
        $search.setAttribute('placeholder', 'Search');
        $search.addEventListener('input', () => {
            this.query = $search.value;
            this.updateResults();
        });

        const $results = document.createElement('ul');
        $results.classList.add('sidebar__list');

        $form.appendChild($today);
        $form.appendChild($search);
        $sidebar.appendChild($form);
        $sidebar.appendChild($results);
        $container.appendChild($sidebar);

        this.$results = $results;
    }

    public setPages(pages: Page[]): void {
        this.pages = pages;
        this.updateResults();
    }

    private updateResults(): void {
        const $results = document.createDocumentFragment();

        for (const result of getSearchResults(this.pages, this.query)) {
            const $result = document.createElement('li');
            $result.classList.add('search-result');

            const $link = document.createElement('a');
            $link.classList.add('internal');
            $link.setAttribute('href', result.url);
            $link.innerHTML = result.title;

            const $matches = document.createElement('ul');
            for (const match of result.matches) {
                const $match = document.createElement('li');
                $match.classList.add('search-result__match');
                $match.innerHTML = match;
                $matches.appendChild($match);
            }

            $result.appendChild($link);
            $result.appendChild($matches);
            $results.appendChild($result);
        }

        this.$results.innerHTML = '';
        this.$results.appendChild($results);
    }
}
