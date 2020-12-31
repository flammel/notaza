import { ApiFiles } from '../api';
import { notazamd } from '../markdown';
import { Card, Page, Style } from '../model';
import * as toml from '../toml';
import { memoize, partial, withoutExtension } from '../util';
import { DataProvider, IndexEntry } from './types';
import { getFences, addTag, updateFiles, getReferences, disjoint, pageNames } from './util';

interface Bookmark {
    readonly id: string;
    readonly date: string;
    readonly url: string;
    readonly title: string;
    readonly tags: string[];
    readonly description: string;
}

function parseBookmark(tokens: toml.Token[], idx: number): Bookmark | undefined {
    const header = tokens[idx];
    const id = tokens[idx + 1];
    const date = tokens[idx + 2];
    const url = tokens[idx + 3];
    const title = tokens[idx + 4];
    const tags = tokens[idx + 5];
    const description = tokens[idx + 6];
    if (
        header?.type === 'header' &&
        header?.header === 'bookmarks' &&
        id?.type === 'keyValue' &&
        date?.type === 'keyValue' &&
        url?.type === 'keyValue' &&
        title?.type === 'keyValue' &&
        tags?.type === 'keyValue' &&
        description?.type === 'keyValue'
    ) {
        return {
            id: id.value,
            date: date.value,
            url: url.value,
            title: title.value,
            tags: tags.value
                .split(' ')
                .map((tag) => tag.replace('#', '').trim())
                .filter((tag) => tag !== ''),
            description: description.value,
        };
    }
}

function parseBookmarks(tomlStr: string): Bookmark[] {
    const result = toml.parse(tomlStr.split('\n'));
    if (result.type === 'success') {
        const bookmarks: Bookmark[] = [];
        for (let idx = 0; idx < result.tokens.length; idx = idx + 7) {
            const bookmark = parseBookmark(result.tokens, idx);
            if (bookmark) {
                bookmarks.push(bookmark);
            }
        }
        return bookmarks;
    } else {
        console.warn('Bookmark parsing failed', result.error);
        return [];
    }
}

function toCard(bookmark: Bookmark): Card {
    return {
        type: 'bookmark',
        url: bookmark.url,
        title: bookmark.title,
        subtitle: bookmark.url,
        tags: bookmark.tags,
        content: [notazamd().render(bookmark.description)],
    };
}

function searchFilter(query: string, bookmark: Bookmark): boolean {
    return (
        bookmark.url.toLowerCase().includes(query) ||
        bookmark.title.toLowerCase().includes(query) ||
        bookmark.description.toLowerCase().includes(query) ||
        bookmark.tags.includes(query)
    );
}

const getOutgoingLinks = memoize(
    (bookmark: Bookmark): Set<string> => {
        return new Set([
            ...bookmark.tags,
            ...getReferences(bookmark.description),
            bookmark.id,
            bookmark.date.substring(0, 10),
        ]);
    },
);

function relatedFilter(page: Page, bookmark: Bookmark): boolean {
    return !disjoint(pageNames(page), getOutgoingLinks(bookmark));
}

export function bookmarkProvider(files: ApiFiles): DataProvider {
    const bookmarks = getFences(files)
        .filter(({ info }) => info === 'bookmark')
        .flatMap(({ file, content }) =>
            parseBookmarks(content).map((bookmark) => addTag(withoutExtension(file.filename), bookmark)),
        );
    const indexEntries = bookmarks.flatMap((bookmark) =>
        bookmark.tags.map((tag) => ({ url: tag + '.md', title: tag })),
    );
    return {
        indexEntries(): IndexEntry[] {
            return indexEntries;
        },
        page(): Page | undefined {
            return undefined;
        },
        related(page): Card[] {
            return bookmarks.filter(partial(relatedFilter, page)).map(toCard);
        },
        search(query): Card[] {
            return bookmarks.filter(partial(searchFilter, query.toLowerCase())).map(toCard);
        },
        styles(): Style[] {
            return [];
        },
        update(filename, content): DataProvider {
            return bookmarkProvider(updateFiles(files, { filename, content }));
        },
    };
}