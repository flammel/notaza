import _ from 'lodash';

import { AppState, Page, Block } from '../model';
import { notUndefined } from '../util';
import { Dispatch } from '../framework';
import * as messages from '../messages/messages';

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

export class SidebarController {
    public constructor(private readonly dispatch: Dispatch) {}
    public getSearch(state: AppState): string {
        return state.search;
    }

    public setSearch(search: string): void {
        this.dispatch(messages.setSearch({ search }));
    }

    public getResults(state: AppState): SearchResult[] {
        return state.pages
            .map((page) => searchInPage(page, state.search))
            .filter(notUndefined)
            .sort(compareResults);
    }
}
