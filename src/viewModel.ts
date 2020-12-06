import { notazamd } from './markdown';
import { Card, Page, SearchResult } from './model';
import { Store, IndexEntry } from './store';

export interface PageViewModel {
    filename: string;
    title: string;
    html: string;
    editLink: string;
    cards: Card[];
}

export interface SearchViewModel {
    query: string;
    results: SearchResult[];
}

export function pageViewModel(store: Store, filename: string, editLink: (page: Page) => string): PageViewModel {
    if (filename === '_index.md') {
        return makeIndexPage(store.getIndex());
    }
    const page = store.getPage(filename);
    return {
        filename: page.id,
        title: page.title,
        editLink: editLink(page),
        html: notazamd().render(page.body),
        cards: store.getRelated(page),
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
        editLink: '',
        html: content.join(''),
        cards: [],
    };
}

export function searchViewModel(store: Store, query: string): SearchViewModel {
    return { query, results: store.search(query.toLowerCase().trim()) };
}
