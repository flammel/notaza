import { Card, Style } from '../model';

export interface IndexEntry {
    title: string;
    url: string;
}

export type CardProducer = (markdownRenderer: (md: string) => string) => Card;

export interface DataProvider {
    indexEntries: () => IndexEntry[];
    card: (filename: string) => Card | undefined;
    related: (card: Card) => CardProducer[];
    search: (query: string) => CardProducer[];
    styles: () => Style[];
    update: (filename: string, content: string) => DataProvider;
}
