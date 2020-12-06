import { withoutExtension } from './util';

type FrontMatter = Record<string, string | undefined>;

export interface Page {
    readonly filename: string;
    readonly isNew: boolean;
    readonly title: string;
    readonly frontMatter: FrontMatter;
    readonly body: string;
    readonly raw: string;
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
        filename,
        isNew,
        frontMatter,
        body,
        title: frontMatter.title || filename,
        raw: content,
    };
}

export function makePageFromFilename(filename: string): Page {
    return {
        filename,
        isNew: true,
        frontMatter: {},
        body: '',
        title: withoutExtension(filename),
        raw: `---\ntitle: ${withoutExtension(filename)}\n---\n`,
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
