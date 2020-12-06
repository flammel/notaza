import { withoutExtension } from './util';

export type PageId = string;
type FrontMatter = Record<string, string | undefined>;

export interface Page {
    readonly id: PageId;
    readonly isNew: boolean;
    readonly title: string;
    readonly frontMatter: FrontMatter;
    readonly body: string;
}

export interface Bookmark {
    readonly id: string;
    readonly date: string;
    readonly url: string;
    readonly title: string;
    readonly tags: string[];
    readonly description: string;
}

export interface Tweet {
    readonly url: string;
    readonly userHandle: string;
    readonly date: string;
    readonly tags: string[];
    readonly tweet: string;
    readonly notes: string;
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

export function makePage(filename: string, isNew: boolean, content: string): Page {
    const { frontMatter, body } = bodyAndFrontMatter(content);
    return {
        id: withoutExtension(filename),
        isNew,
        frontMatter,
        body,
        title: frontMatter.title || filename,
    };
}

export function makePageFromFilename(filename: string): Page {
    return {
        id: withoutExtension(filename),
        isNew: true,
        frontMatter: {},
        body: '',
        title: withoutExtension(filename),
    };
}

function parseFrontMatter(frontMatter: string): FrontMatter {
    return Object.fromEntries(
        frontMatter
            .split('\n')
            .map((line) => line.split(':'))
            .map(([key, ...value]) => [key, value.join(':').trim()]),
    );
}

function bodyAndFrontMatter(content: string): { frontMatter: FrontMatter; body: string } {
    const [frontMatterStr, ...bodyParts] = content.split('\n---\n');
    if (bodyParts.length < 1 || !frontMatterStr.startsWith('---\n')) {
        return { frontMatter: {}, body: content };
    } else {
        return { frontMatter: parseFrontMatter(frontMatterStr.substring(4)), body: bodyParts.join('\n---\n') };
    }
}
