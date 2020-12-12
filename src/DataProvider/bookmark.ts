import { ApiFiles } from '../api';
import { notazamd } from '../markdown';
import { Card, Page, Style } from '../model';
import * as toml from '../toml';
import { notUndefined, partial, withoutExtension } from '../util';
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

const bookmarksParser = toml.many(
    toml.map(
        toml.sequence([
            toml.tableHeader('bookmarks'),
            toml.singleLineStringKeyValue('id'),
            toml.dateKeyValue('date'),
            toml.singleLineStringKeyValue('url'),
            toml.singleLineStringKeyValue('title'),
            toml.singleLineStringKeyValue('tags'),
            toml.oneOf(toml.singleLineStringKeyValue('description'), toml.multiLineStringKeyValue('description')),
            toml.optional(toml.emptyLine()),
        ]),
        ([, id, date, url, title, tags, description]) => {
            if (
                id !== null &&
                date !== null &&
                url !== null &&
                title !== null &&
                tags !== null &&
                description !== null
            ) {
                return {
                    id,
                    date,
                    url,
                    title,
                    tags: tags
                        .split(' ')
                        .map((tag) => tag.replace('#', '').trim())
                        .filter((tag) => tag !== ''),
                    description,
                };
            } else {
                return undefined;
            }
        },
    ),
);

function parseBookmarks(toml: string): Bookmark[] {
    const result = bookmarksParser({ lines: toml.split('\n'), index: 0 });
    if (result.success) {
        return result.value.filter(notUndefined);
    } else {
        console.warn('Bookmark parsing failed', result.expected);
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
