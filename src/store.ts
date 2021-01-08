import { Card, SearchResult } from './model';
import { DataProvider, IndexEntry } from './DataProvider/types';
import { notazamd } from './markdown';
import { withoutExtension } from './util';

export interface Store {
    index: () => IndexEntry[];
    card: (filename: string) => Card | undefined;
    related: (card: Card) => Card[];
    search: (query: string) => SearchResult[];
    styles: () => string[];
    update: (filename: string, content: string) => void;
}

export function makeStore(dataProviders: DataProvider[]): Store {
    return {
        index(): IndexEntry[] {
            return [
                ...new Map(
                    dataProviders.flatMap((provider) => provider.indexEntries().map((entry) => [entry.url, entry])),
                ).values(),
            ];
        },
        card(filename: string): Card | undefined {
            return dataProviders.reduce(
                (card: Card | undefined, provider: DataProvider) => card ?? provider.card(filename),
                undefined,
            );
        },
        related(card: Card): Card[] {
            return dataProviders
                .flatMap((provider) => provider.related(card))
                .map((producer) => producer(notazamd().render));
        },
        search(query: string): SearchResult[] {
            if (query.length < 3) {
                return [];
            }
            return dataProviders
                .flatMap((provider) => provider.search(query))
                .map((producer) => producer(notazamd().render))
                .sort(searchResultSort(query));
        },
        styles(): string[] {
            return dataProviders.flatMap((provider) => provider.styles());
        },
        update(filename: string, content: string): void {
            dataProviders = dataProviders.map((provider) => provider.update(filename, content));
        },
    };
}

function searchResultSort(query: string): (a: SearchResult, b: SearchResult) => number {
    return (a: SearchResult, b: SearchResult): number => {
        if (a.type === 'page' && b.type === 'page') {
            const aIdx = a.title.toLowerCase().indexOf(query.toLowerCase());
            const bIdx = b.title.toLowerCase().indexOf(query.toLowerCase());
            return (aIdx < 0 ? 4096 : aIdx) - (bIdx < 0 ? 4096 : bIdx);
        }
        if (a.type === 'page') {
            return -1;
        }
        if (b.type === 'page') {
            return 1;
        }
        return 0;
    };
}

export function getOrMakeCard(store: Store, filename: string): Card {
    if (filename === '_index.md') {
        return makeIndexCard(store.index());
    }
    if (filename === '') {
        filename = 'index.md';
    }
    return store.card(filename) ?? makeCardFromFilename(filename);
}

function makeCardFromFilename(filename: string): Card {
    return {
        filename,
        title: withoutExtension(filename),
        tags: [],
        type: 'page',
        content: [],
    };
}

function makeIndexCard(entries: IndexEntry[]): Card {
    const content = [
        '<ul>',
        ...entries
            .sort((a, b) => a.title.localeCompare(b.title))
            .map((entry) => `<li><a class="internal" href="/#/${entry.url}">${entry.title}</a></li>`),
        '</ul>',
    ].join('');
    return {
        filename: '_index.md',
        title: 'Index',
        type: 'index',
        tags: [],
        content: [content],
    };
}
