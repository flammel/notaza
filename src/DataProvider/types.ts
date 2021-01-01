import { Card, Page, Style } from '../model';

export interface IndexEntry {
    title: string;
    url: string;
}

export type CardProducer = (markdownRenderer: (md: string) => string) => Card;

export interface DataProvider {
    indexEntries: () => IndexEntry[];
    page: (filename: string) => Page | undefined;
    related: (page: Page) => CardProducer[];
    search: (query: string) => CardProducer[];
    styles: () => Style[];
    update: (filename: string, content: string) => DataProvider;
}
