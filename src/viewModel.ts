import { IndexEntry } from './DataProvider/types';
import { makePageFromFilename } from './DataProvider/util';
import { notazamd } from './markdown';
import { Card, SearchResult } from './model';
import { Store } from './store';

export interface PageViewModel {
    filename: string;
    title: string;
    html: string;
    raw: string;
    cards: Card[];
    editing: boolean;
}

export interface SearchViewModel {
    query: string;
    results: SearchResult[];
}

export function pageViewModel(store: Store, filename: string, editing: boolean): PageViewModel {
    if (filename === '_index.md') {
        return makeIndexPage(store.index());
    }
    const page = store.page(filename) ?? makePageFromFilename(filename);
    return {
        filename: page.filename,
        title: page.title,
        html: notazamd().render(page.body),
        raw: page.raw,
        cards: store.related(page),
        editing,
    };
}

function makeIndexPage(entries: IndexEntry[]): PageViewModel {
    const content = [
        '<ul>',
        ...entries
            .sort((a, b) => a.title.localeCompare(b.title))
            .map((entry) => `<li><a class="internal" href="/#/${entry.url}">${entry.title}</a></li>`),
        '</ul>',
    ];
    return {
        filename: '_index.md',
        title: 'Index',
        html: content.join(''),
        cards: [],
        raw: '',
        editing: false,
    };
}

export function searchViewModel(store: Store, query: string): SearchViewModel {
    return { query, results: store.search(query.toLowerCase().trim()) };
}
