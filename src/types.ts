export interface Card {
    readonly title: string;
    readonly filename: string;
    readonly content: string;
}

export type SearchResult = Card;

export type Style = string;

export interface IndexEntry {
    title: string;
    url: string;
}

export interface Store {
    index: () => IndexEntry[];
    card: (filename: string) => Card | undefined;
    related: (card: Card) => Card[];
    search: (query: string) => SearchResult[];
    styles: () => string[];
    update: (filename: string, content: string) => void;
    rawContent: (filename: string) => string;
}
