type FrontMatter = Map<string, string>;

export interface Page {
    readonly id: string;
    readonly filename: string;
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
    readonly date: string;
    readonly tags: string[];
    readonly tweet: string;
    readonly notes: string;
}

export interface Block {
    content: string;
    children: Block[];
}

export function makePage(filename: string, isNew: boolean, content: string): Page {
    const { frontMatter, body } = bodyAndFrontMatter(content);
    return {
        filename,
        isNew,
        frontMatter,
        body,
        title: frontMatter.get('title') || filename,
        id: withoutExtension(filename),
    };
}

export function makePageFromFilename(filename: string): Page {
    return {
        filename,
        isNew: true,
        frontMatter: new Map(),
        body: '',
        id: withoutExtension(filename),
        title: withoutExtension(filename),
    };
}

function parseFrontMatter(frontMatter: string): FrontMatter {
    return new Map(
        frontMatter
            .split('\n')
            .map((line) => line.split(':'))
            .map(([key, ...value]) => [key, value.join(':').trim()]),
    );
}

function bodyAndFrontMatter(content: string): { frontMatter: FrontMatter; body: string } {
    const [frontMatterStr, ...bodyParts] = content.split('\n---\n');
    if (bodyParts.length < 1 || !frontMatterStr.startsWith('---\n')) {
        return { frontMatter: new Map(), body: content };
    } else {
        return { frontMatter: parseFrontMatter(frontMatterStr.substring(4)), body: bodyParts.join('\n---\n') };
    }
}

function withoutExtension(filename: string): string {
    return filename.split('.').slice(0, -1).join('.');
}
