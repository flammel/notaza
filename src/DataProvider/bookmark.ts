import { ApiFiles } from '../api';
import { notazamd } from '../markdown';
import { Card, Page, Style } from '../model';
import * as toml from '../toml';
import { partial, withoutExtension } from '../util';
import { DataProvider } from './types';
import {
    getFences,
    addTag,
    pageAliases,
    containsReference,
    makePageFromFilename,
    updateFiles,
    relatedByDate,
} from './util';

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
            if (typeof bookmark === 'string') {
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

function relatedFilter(page: Page, bookmark: Bookmark): boolean {
    return (
        bookmark.tags.includes(page.id) ||
        containsReference(bookmark.description, page) ||
        pageAliases(page).some((alias) => bookmark.tags.includes(alias)) ||
        bookmark.id === page.id ||
        relatedByDate(page, bookmark)
    );
}

export function bookmarkProvider(files: ApiFiles): DataProvider {
    const toml = files.find((file) => file.filename === 'bookmarks.toml');
    const tomlBookmarks = toml ? parseBookmarks(toml.content) : [];
    const mdBookmarks = getFences(files)
        .filter(({ info }) => info === 'bookmark')
        .flatMap(({ file, content }) =>
            parseBookmarks(content).map((bookmark) => addTag(withoutExtension(file.filename), bookmark)),
        );
    const bookmarks = [...tomlBookmarks, ...mdBookmarks];
    const pages = new Map<string, Page>(
        bookmarks.flatMap((bookmark) => bookmark.tags.map((tag) => [tag + '.md', makePageFromFilename(tag + '.md')])),
    );
    return {
        pages(): Page[] {
            return [...pages.values()];
        },
        page(filename): Page | undefined {
            return pages.get(filename);
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
