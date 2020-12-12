import { ApiFile, ApiFiles } from '../api';
import { notazamd } from '../markdown';
import { Page } from '../model';
import { memoize, withoutExtension } from '../util';

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

export function containsReference(str: string, page: Page): boolean {
    const haystack = str.toLocaleLowerCase();
    return (
        haystack.includes('](./' + page.filename.toLocaleLowerCase() + ')') ||
        haystack.includes('](./' + withoutExtension(page.filename.toLocaleLowerCase()) + ')') ||
        haystack.includes('#' + withoutExtension(page.filename.toLocaleLowerCase())) ||
        haystack.includes('[[' + page.title.toLocaleLowerCase() + ']]') ||
        pageAliases(page).some(
            (alias) =>
                haystack.includes('](./' + alias + ')') ||
                haystack.includes('#' + alias) ||
                haystack.includes('[[' + alias + ']]'),
        )
    );
}

export function pageAliases(page: Page): string[] {
    return (
        page.frontMatter.aliases
            ?.split(' ')
            .map((alias) => alias.trim())
            .filter((alias) => alias !== '') ?? []
    );
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

export function relatedByDate(page: Page, item: { date: string }): boolean {
    return item.date.startsWith(page.filename.substring(0, 10));
}
