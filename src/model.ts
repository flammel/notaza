export interface Card {
    readonly type: string;
    readonly title: string;
    readonly filename: string;
    readonly url?: string;
    readonly subtitle?: string;
    readonly tags: string[];
    readonly content: string[];
}

export type SearchResult = Card;

export type Style = string;
