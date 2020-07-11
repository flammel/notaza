import { Page, Block } from '../store/state';
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

export function getSearchResults(pages: Page[], query: string): SearchResult[] {
    return pages
        .map((page) => searchInPage(page, query))
        .filter(notUndefined)
        .sort(compareResults);
}
