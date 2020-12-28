export type FrontMatter = Record<string, string | undefined>;

export interface Page {
    readonly filename: string;
    readonly id: string;
    readonly title: string;
    readonly frontMatter: FrontMatter;
    readonly body: string;
    readonly raw: string;
}

export interface Card {
    readonly type: string;
    readonly url?: string;
    readonly title: string;
    readonly subtitle?: string;
    readonly tags: string[];
    readonly content: string[];
}

export type SearchResult = Card;

export type Style = string;
