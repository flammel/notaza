import _ from 'lodash';

import { MessageBus } from '../framework';
import { setSearch } from '../messages/messages';
import { AppState, Block, Page } from '../model';
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
const flatBlocksMem = _.memoize(flatBlocks);

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
    const matchingBlocks: Block[] = flatBlocksMem(page).filter(
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

export class SidebarView {
    private results: SearchResult[] = [];
    private readonly $input: HTMLInputElement;
    private readonly $resultList: HTMLUListElement;

    public constructor($parent: HTMLElement, mbus: MessageBus) {
        const $root = document.createElement('div');
        $root.classList.add('sidebar');

        const $header = document.createElement('form');
        $header.classList.add('sidebar__header');

        const $today = document.createElement('a');
        $today.classList.add('internal');
        $today.href = '/';
        $today.innerText = 'Today';

        this.$input = document.createElement('input');
        this.$input.placeholder = 'Search';
        this.$input.addEventListener('input', () => mbus.dispatch(setSearch({ search: this.$input.value })));

        $header.appendChild($today);
        $header.appendChild(this.$input);

        this.$resultList = document.createElement('ul');
        this.$resultList.classList.add('sidebar__list');

        $root.appendChild($header);
        $root.appendChild(this.$resultList);

        $parent.appendChild($root);
    }

    public update(state: AppState): void {
        this.$input.value = state.search;
        const newResults = state.pages
            .map((page) => searchInPage(page, state.search))
            .filter(notUndefined)
            .sort(compareResults);
        if (_.isEqual(this.results, newResults)) {
            return;
        }
        this.results = newResults;
        this.$resultList.innerHTML = newResults
            .map(
                (result) =>
                    `<li class="search-result">
                        <a class="internal" href="${result.url}">${result.title}</a>
                        <ul>${result.matches
                            .map((match) => `<li class="search-result__match">${match}</li>`)
                            .join('')}</ul>
                    </li>`,
            )
            .join('');
    }
}
