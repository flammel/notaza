import { Card, Page, Style } from '../model';

export interface IndexEntry {
    title: string;
    url: string;
}

export interface DataProvider {
    indexEntries: () => IndexEntry[];
    page: (filename: string) => Page | undefined;
    related: (page: Page) => Card[];
    search: (query: string) => Card[];
    styles: () => Style[];
    update: (filename: string, content: string) => DataProvider;
}
