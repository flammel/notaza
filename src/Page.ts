type FrontMatter = Map<string, string>;

function parseFrontMatter(frontMatter: string): FrontMatter {
    return new Map(
        frontMatter
            .split('\n')
            .map((line) => line.split(':'))
            .map(([key, ...value]) => [key, value.join(':').trim()]),
    );
}

export class Page {
    public readonly filename: string;
    public readonly version: string | undefined;
    public readonly frontMatter: FrontMatter;
    public readonly body: string;

    public constructor(filename: string, version: string | undefined, content: string) {
        this.filename = filename;
        this.version = version;
        const parts = content.split('\n---\n');
        if (parts.length < 2 || !parts[0].startsWith('---\n')) {
            this.frontMatter = new Map();
            this.body = content;
        } else {
            const [frontMatter, ...bodyParts] = parts;
            this.frontMatter = parseFrontMatter(frontMatter.substring(4));
            this.body = bodyParts.join('\n---\n');
        }
    }

    public get title(): string {
        return this.frontMatter.get('title') || this.filename;
    }

    public get fileId(): string {
        return this.filename.slice(0, -3);
    }
}
