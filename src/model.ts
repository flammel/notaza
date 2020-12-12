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
    type: string;
    url?: string;
    title: string;
    subtitle?: string;
    tags: string[];
    content: string[];
}

export type SearchResult = Card;

export type Style = string;
