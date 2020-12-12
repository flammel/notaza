import { Page, Card, SearchResult } from './model';
import { DataProvider } from './DataProvider/types';

export interface IndexEntry {
    title: string;
    url: string;
}

export interface Store {
    index: () => IndexEntry[];
    page: (filename: string) => Page | undefined;
    related: (page: Page) => Card[];
    search: (query: string) => SearchResult[];
    styles: () => string[];
    update: (filename: string, content: string) => void;
}

export function makeStore(dataProviders: DataProvider[]): Store {
    return {
        index(): IndexEntry[] {
            return [
                ...new Map(
                    dataProviders.flatMap((provider) => provider.pages().map((page) => [page.filename, page.title])),
                ).entries(),
            ].map(([url, title]) => ({ url, title }));
        },
        page(filename: string): Page | undefined {
            return dataProviders.reduce(
                (page: Page | undefined, provider: DataProvider) => page ?? provider.page(filename),
                undefined,
            );
        },
        related(page: Page): Card[] {
            return dataProviders.flatMap((provider) => provider.related(page));
        },
        search(query: string): SearchResult[] {
            if (query.length < 3) {
                return [];
            }
            return dataProviders.flatMap((provider) => provider.search(query)).sort(searchResultSort(query));
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
