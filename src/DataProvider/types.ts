import { Card, SearchResult, Style } from '../model';

export interface IndexEntry {
    title: string;
    url: string;
}

export type MarkdownRenderer = (md: string) => string;

export interface DataProvider {
    indexEntries: () => IndexEntry[];
    card: (filename: string) => Card | undefined;
    related: (card: Card) => Card[];
    search: (query: string) => SearchResult[];
    styles: () => Style[];
    update: (filename: string, content: string) => DataProvider;
}
