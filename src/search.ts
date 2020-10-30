import { Bookmark, Page, Tweet } from './Page';
import { notUndefined } from './util';

interface SearchResult {
    page: Page;
    matches: string[];
    titleMatch: boolean;
}

function searchInPage(page: Page, query: string): SearchResult | undefined {
    if (query === '') {
        return {
            page,
            matches: [],
            titleMatch: false,
        };
    }
    const bodyMatches = page.body.toLowerCase().split(query.toLowerCase());
    const titleMatch = page.title.toLowerCase().includes(query.toLowerCase());
    if (bodyMatches.length > 1 || titleMatch) {
        return {
            page,
            matches: [],
            titleMatch,
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

export function getSearchResults(pages: Page[], query: string): Page[] {
    return pages
        .map((page) => searchInPage(page, query))
        .filter(notUndefined)
        .sort(compareResults)
        .map((result) => result.page);
}
