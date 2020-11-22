import Token from 'markdown-it/lib/token';
import { notazamd } from './markdown';
import { Bookmark, makePageFromFilename, Page, searchInBookmark, searchInPage, searchInTweet, Tweet } from './model';
import { Store } from './store';

export interface BookmarkViewModel {
    url: string;
    title: string;
    date: string;
    tags: string[];
    descriptionHtml: string;
}

export interface TweetViewModel {
    url: string;
    userHandle: string;
    date: string;
    tags: string[];
    tweet: string;
    notesHtml: string;
}

export interface BacklinkViewModel {
    filename: string;
    title: string;
    content: string;
}

export interface PageViewModel {
    filename: string;
    title: string;
    html: string;
    editLink: string;
    bookmarks: BookmarkViewModel[];
    tweets: TweetViewModel[];
    backlinks: BacklinkViewModel[];
}

export type SearchResult =
    | { type: 'bookmark'; bookmark: BookmarkViewModel }
    | { type: 'tweet'; tweet: TweetViewModel }
    | { type: 'page'; page: BacklinkViewModel };

export interface SearchViewModel {
    query: string;
    results: SearchResult[];
}

export function pageViewModel(store: Store, filename: string, editLink: (page: Page) => string): PageViewModel {
    if (filename === '_index.md') {
        return makeIndexPage(store.pages);
    }
    const page = store.pages.find((page) => page.filename === filename) ?? makePageFromFilename(filename);
    return {
        filename: page.filename,
        title: page.title,
        editLink: editLink(page),
        html: notazamd().render(page.body),
        bookmarks: store.bookmarks
            .filter((bookmark) => bookmark.tags.includes(page.id) || containsReference(bookmark.description, page))
            .map((bookmark) => bookmarkViewModel(bookmark)),
        tweets: store.tweets
            .filter(
                (tweet) =>
                    tweet.tags.includes(page.id) ||
                    containsReference(tweet.tweet, page) ||
                    containsReference(tweet.notes, page),
            )
            .map((tweet) => tweetViewModel(tweet)),
        backlinks: store.pages
            .filter((other) => other.id !== page.id && containsReference(other.body, page))
            .map((other) => ({
                title: other.title,
                filename: other.filename,
                content: getFilteredContent(other, (md) => containsReference(md, page)),
            })),
    };
}

function containsReference(str: string, page: Page): boolean {
    return (
        str.toLocaleLowerCase().includes('](./' + page.filename.toLocaleLowerCase() + ')') ||
        str.toLocaleLowerCase().includes('](./' + page.filename.toLocaleLowerCase().slice(0, -3) + ')') ||
        str.toLocaleLowerCase().includes('#' + page.filename.toLocaleLowerCase().slice(0, -3)) ||
        str.toLocaleLowerCase().includes('[[' + page.title.toLocaleLowerCase() + ']]')
    );
}

function makeIndexPage(pages: Page[]): PageViewModel {
    const content = [
        '<ul>',
        ...pages
            .sort((a, b) => a.title.localeCompare(b.title))
            .map((page) => `<li><a class="internal" href="/#/${page.filename}">${page.title}</a></li>`),
        '</ul>',
    ];
    return {
        filename: '_index.md',
        title: 'Index',
        editLink: '',
        html: content.join(''),
        bookmarks: [],
        tweets: [],
        backlinks: [],
    };
}

interface Block {
    tokens: Token[];
}
const cache = new Map<string, Block[]>();
function getCachedBlocks(page: Page): Block[] {
    const cached = cache.get(page.id);
    if (cached !== undefined) {
        return cached;
    }
    const tokens = notazamd().parse(page.body);
    let open = 0;
    const blocks = [];
    let block = [];
    for (const token of tokens) {
        if (token.type === 'list_item_open') {
            open++;
            if (open === 1) {
                continue;
            }
        }
        if (token.type === 'list_item_close') {
            open--;
            if (open === 0) {
                blocks.push({ tokens: block });
                block = [];
                continue;
            }
        }
        if (open > 0) {
            block.push(token);
        }
    }
    cache.set(page.id, blocks);
    return blocks;
}
function getFilteredContent(page: Page, filter: (md: string) => boolean): string {
    const blocks = getCachedBlocks(page).filter((block) => block.tokens.some((token) => filter(token.content)));
    return `<ul>${blocks.map((b) => '<li>' + notazamd().renderTokens(b.tokens) + '</li>').join('')}</ul>`;
}

export function searchViewModel(store: Store, query: string): SearchViewModel {
    query = query.toLowerCase().trim();
    if (query.length < 2) {
        return { query, results: [] };
    }
    const pageResults: SearchResult[] = store.pages.filter(searchInPage(query)).map((page) => ({
        type: 'page',
        page: {
            filename: page.filename,
            title: page.title,
            content: getFilteredContent(page, (md) => md.toLowerCase().includes(query.toLowerCase())),
        },
    }));
    const bookmarkResults: SearchResult[] = store.bookmarks.filter(searchInBookmark(query)).map((bookmark) => ({
        type: 'bookmark',
        bookmark: bookmarkViewModel(bookmark),
    }));
    const tweetResults: SearchResult[] = store.tweets.filter(searchInTweet(query)).map((tweet) => ({
        type: 'tweet',
        tweet: tweetViewModel(tweet),
    }));

    return {
        query: query,
        results: [...pageResults, ...bookmarkResults, ...tweetResults].sort(searchResultSort(query)),
    };
}

function searchResultSort(query: string): (a: SearchResult, b: SearchResult) => number {
    return (a: SearchResult, b: SearchResult): number => {
        if (a.type === 'page' && b.type === 'page') {
            const aIdx = a.page.title.toLowerCase().indexOf(query.toLowerCase());
            const bIdx = b.page.title.toLowerCase().indexOf(query.toLowerCase());
            return (aIdx < 0 ? 4096 : aIdx) - (bIdx < 0 ? 4096 : bIdx);
        }
        if (a.type === 'page') {
            return -1;
        }
        if (b.type === 'page') {
            return 1;
        }
        return 0;
    };
}

export function bookmarkViewModel(bookmark: Bookmark): BookmarkViewModel {
    return {
        title: bookmark.title,
        tags: bookmark.tags,
        url: bookmark.url,
        date: bookmark.date,
        descriptionHtml: notazamd().render(bookmark.description),
    };
}

export function tweetViewModel(tweet: Tweet): TweetViewModel {
    return {
        url: tweet.url,
        userHandle: tweet.userHandle,
        date: tweet.date,
        tags: tweet.tags,
        tweet: tweet.tweet,
        notesHtml: notazamd().render(tweet.notes),
    };
}
