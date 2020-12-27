import Token from 'markdown-it/lib/token';
import { ApiFile, ApiFiles } from '../api';
import { notazamd } from '../markdown';
import { Page } from '../model';
import { memoize, urlize, withoutExtension } from '../util';

interface Fence {
    readonly file: ApiFile;
    readonly info: string;
    readonly content: string;
}

export const getFences = memoize((apiFiles: ApiFiles): Fence[] =>
    apiFiles
        .filter((apiFile) => apiFile.filename.endsWith('.md'))
        .flatMap((file) =>
            notazamd()
                .parse(file.content)
                .filter((token) => token.type === 'fence')
                .map((token) => ({ file, info: token.info.trim(), content: token.content })),
        ),
);

export function addTag<T extends { tags: string[] }>(tag: string, tagged: T): T {
    return { ...tagged, tags: [...new Set([...tagged.tags, tag])] };
}

export function pageAliases(page: Page): string[] {
    return (
        page.frontMatter.aliases
            ?.split(' ')
            .map((alias) => alias.trim())
            .filter((alias) => alias !== '') ?? []
    );
}

export function pageNames(page: Page): Set<string> {
    return new Set([...pageAliases(page), page.id]);
}

export function makePageFromFilename(filename: string): Page {
    return {
        filename,
        frontMatter: {},
        body: '',
        title: withoutExtension(filename),
        id: withoutExtension(filename),
        raw: `---\ntitle: ${withoutExtension(filename)}\n---\n`,
    };
}

export function updateFiles(files: ApiFiles, file: ApiFile): ApiFiles {
    if (files.find((other) => other.filename === file.filename)) {
        return files.map((other) => (other.filename === file.filename ? file : other));
    } else {
        return [...files, file];
    }
}

export function disjoint<T>(a: Set<T>, b: Set<T>): boolean {
    return [...a].every((x) => !b.has(x));
}

export const getReferences = memoize((input: string|Token[]): Set<string> => {
    const inputTokens = typeof input === 'string' ? notazamd().parse(input) : input;
    const tokens = inputTokens.flatMap((token) => [token, ...token.children ?? []]);
    const references = new Set<string>();
    for (const token of tokens) {
        if (token.type === 'link_open') {
            const href = token.attrGet('href');
            const id = (href ?? '').replace('.md', '').replace('./', '').replace('/#/', '');
            if (id && !id.startsWith('http://') && !id.startsWith('https://')) {
                references.add(id);
            }
        } else if (token.type === 'hashtag') {
            references.add(token.content)
        } else if (token.type === 'wikilink') {
            references.add(urlize(token.content))
        }
    }
    return references;
});
