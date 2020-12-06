import { ApiFile, ApiFiles } from './api';
import { notazamd } from './markdown';
import { parseBookmarks, parseTweets } from './toml';
import { Bookmark, Tweet, Page, PageId, makePageFromFilename, makePage, Card, SearchResult } from './model';
import Token from 'markdown-it/lib/token';
import { withoutExtension } from './util';

type Filename = string;

export interface IndexEntry {
    title: string;
    url: string;
}

interface Fence {
    readonly file: ApiFile;
    readonly info: string;
    readonly content: string;
}

interface Block {
    tokens: Token[];
}

class PageRepository {
    private static cache = new Map<string, Block[]>();
    private readonly pages: Map<PageId, Page>;

    public constructor(apiFiles: ApiFiles) {
        this.pages = new Map(
            apiFiles
                .filter((apiFile) => apiFile.filename.endsWith('.md'))
                .map((apiFile) => makePage(apiFile.filename, false, apiFile.content))
                .map((page) => [page.id, page]),
        );
    }

    public getAll(): Page[] {
        return [...this.pages.values()];
    }

    public getById(id: PageId): Page | undefined {
        return this.pages.get(id) ?? this.pages.get(withoutExtension(id));
    }

    public addIfMissing(page: Page): void {
        if (!this.pages.has(page.id)) {
            this.pages.set(page.id, page);
        }
    }

    public findRelated(page: Page): Card[] {
        return this.getAll()
            .filter((other) => other.id !== page.id && containsReference(other.body, page))
            .map((other) => ({
                type: 'page',
                url: other.id,
                title: other.title,
                tags: [],
                content: [PageRepository.getFilteredContent(other, (md) => containsReference(md, page))],
            }));
    }

    public search(query: string): SearchResult[] {
        query = query.toLocaleLowerCase();
        return this.getAll()
            .filter(PageRepository.searchInPage(query.toLowerCase()))
            .map((other) => ({
                type: 'page',
                url: other.id,
                title: other.title,
                tags: [],
                content: [PageRepository.getFilteredContent(other, (md) => md.toLocaleLowerCase().includes(query))],
            }));
    }

    private static searchInPage(query: string): (page: Page) => boolean {
        return (page: Page): boolean =>
            page.title.toLowerCase().includes(query) || page.body.toLowerCase().includes(query);
    }

    private static getCachedBlocks(page: Page): Block[] {
        const cached = PageRepository.cache.get(page.id);
        if (cached !== undefined) {
            return cached;
        }
        const tokens = notazamd().parse(page.body);
        let open = 0;
        const blocks = [];
        let block = [];
        for (const token of tokens) {
            if (
                (token.type === 'list_item_open' && token.level === 1) ||
                (token.type === 'paragraph_open' && token.level === 0)
            ) {
                open++;
                continue;
            }
            if (
                (token.type === 'list_item_close' && token.level === 1) ||
                (token.type === 'paragraph_close' && token.level === 0)
            ) {
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
        PageRepository.cache.set(page.id, blocks);
        return blocks;
    }

    private static getFilteredContent(page: Page, filter: (md: string) => boolean): string {
        const blocks = PageRepository.getCachedBlocks(page).filter((block) =>
            block.tokens.some((token) => filter(token.content)),
        );
        return `<ul>${blocks.map((b) => '<li>' + notazamd().renderTokens(b.tokens) + '</li>').join('')}</ul>`;
    }
}

class BookmarkRepository {
    private readonly bookmarks: Bookmark[];

    public constructor(apiFiles: ApiFiles) {
        const toml = apiFiles.find((file) => file.filename === 'bookmarks.toml');
        const tomlBookmarks = toml ? parseBookmarks(toml.content) : [];
        const mdBookmarks = getFences(apiFiles)
            .filter(({ info }) => info === 'bookmark')
            .flatMap(({ file, content }) =>
                parseBookmarks(content).map((bookmark) => addTag(withoutExtension(file.filename), bookmark)),
            );
        this.bookmarks = [...tomlBookmarks, ...mdBookmarks];
    }

    public getTags(): string[] {
        return [...new Set(this.bookmarks.flatMap(({ tags }) => tags))];
    }

    public findRelated(page: Page): Card[] {
        return this.bookmarks
            .filter((bookmark) => bookmark.tags.includes(page.id) || containsReference(bookmark.description, page))
            .map(BookmarkRepository.toCard);
    }

    public search(query: string): SearchResult[] {
        return this.bookmarks
            .filter(BookmarkRepository.searchInBookmark(query.toLowerCase()))
            .map(BookmarkRepository.toCard);
    }

    private static toCard(bookmark: Bookmark): Card {
        return {
            type: 'bookmark',
            url: bookmark.url,
            title: bookmark.title,
            subtitle: bookmark.url,
            tags: bookmark.tags,
            content: [notazamd().render(bookmark.description)],
        };
    }

    private static searchInBookmark(query: string): (bookmark: Bookmark) => boolean {
        return (bookmark: Bookmark): boolean =>
            bookmark.url.toLowerCase().includes(query) ||
            bookmark.title.toLowerCase().includes(query) ||
            bookmark.description.toLowerCase().includes(query) ||
            bookmark.tags.includes(query);
    }
}

class TweetRepository {
    private readonly tweets: Tweet[];

    public constructor(apiFiles: ApiFiles) {
        const toml = apiFiles.find((file) => file.filename === 'tweets.toml');
        const tomlTweets = toml ? parseTweets(toml.content) : [];
        const mdTweets = getFences(apiFiles)
            .filter(({ info }) => info === 'tweet')
            .flatMap(({ file, content }) =>
                parseTweets(content).map((tweet) => addTag(withoutExtension(file.filename), tweet)),
            );
        this.tweets = [...tomlTweets, ...mdTweets];
    }

    public getTags(): string[] {
        return [...new Set(this.tweets.flatMap(({ tags }) => tags))];
    }

    public findRelated(page: Page): Card[] {
        return this.tweets
            .filter(
                (tweet) =>
                    tweet.tags.includes(page.id) ||
                    containsReference(tweet.tweet, page) ||
                    containsReference(tweet.notes, page),
            )
            .map(TweetRepository.toCard);
    }

    public search(query: string): SearchResult[] {
        return this.tweets.filter(TweetRepository.searchInTweet(query.toLowerCase())).map(TweetRepository.toCard);
    }

    private static toCard(tweet: Tweet): Card {
        return {
            type: 'tweet',
            url: tweet.url,
            title: '@' + tweet.userHandle,
            subtitle: 'on ' + tweet.date,
            tags: tweet.tags,
            content: [tweet.tweet.replace(/\n/g, '<br>'), notazamd().render(tweet.notes)],
        };
    }

    private static searchInTweet(query: string): (tweet: Tweet) => boolean {
        return (tweet: Tweet): boolean =>
            tweet.url.toLowerCase().includes(query) ||
            tweet.tweet.toLowerCase().includes(query) ||
            tweet.notes.toLowerCase().includes(query) ||
            tweet.tags.includes(query);
    }
}

export class Store {
    private readonly pageRepo: PageRepository;
    private readonly bookmarkRepo: BookmarkRepository;
    private readonly tweetRepo: TweetRepository;

    public constructor(apiFiles: ApiFiles) {
        this.pageRepo = new PageRepository(apiFiles);
        this.bookmarkRepo = new BookmarkRepository(apiFiles);
        this.tweetRepo = new TweetRepository(apiFiles);

        for (const tag of this.bookmarkRepo.getTags()) {
            this.pageRepo.addIfMissing(makePageFromFilename(tag + '.md'));
        }
        for (const tag of this.tweetRepo.getTags()) {
            this.pageRepo.addIfMissing(makePageFromFilename(tag + '.md'));
        }
    }

    public getIndex(): IndexEntry[] {
        return this.pageRepo.getAll().map((page) => ({
            url: page.id,
            title: page.title,
        }));
    }

    public getPage(filename: Filename): Page {
        return this.pageRepo.getById(filename) ?? makePageFromFilename(filename);
    }

    public getRelated(page: Page): Card[] {
        return [
            ...this.pageRepo.findRelated(page),
            ...this.tweetRepo.findRelated(page),
            ...this.bookmarkRepo.findRelated(page),
        ];
    }

    public search(query: string): SearchResult[] {
        if (query.length < 3) {
            return [];
        }
        return [
            ...this.pageRepo.search(query),
            ...this.tweetRepo.search(query),
            ...this.bookmarkRepo.search(query),
        ].sort(searchResultSort(query));
    }
}

function searchResultSort(query: string): (a: SearchResult, b: SearchResult) => number {
    return (a: SearchResult, b: SearchResult): number => {
        if (a.type === 'page' && b.type === 'page') {
            const aIdx = a.title.toLowerCase().indexOf(query.toLowerCase());
            const bIdx = b.title.toLowerCase().indexOf(query.toLowerCase());
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

function getFences(apiFiles: ApiFiles): Fence[] {
    return apiFiles
        .filter((apiFile) => apiFile.filename.endsWith('.md'))
        .flatMap((file) =>
            notazamd()
                .parse(file.content)
                .filter((token) => token.type === 'fence')
                .map((token) => ({ file, info: token.info.trim(), content: token.content })),
        );
}

function containsReference(str: string, page: Page): boolean {
    return (
        str.toLocaleLowerCase().includes('](./' + page.id.toLocaleLowerCase() + ')') ||
        str.toLocaleLowerCase().includes('](./' + page.id.toLocaleLowerCase() + ')') ||
        str.toLocaleLowerCase().includes('#' + page.id.toLocaleLowerCase()) ||
        str.toLocaleLowerCase().includes('[[' + page.title.toLocaleLowerCase() + ']]')
    );
}

function addTag<T extends { tags: string[] }>(tag: string, tagged: T): T {
    return { ...tagged, tags: [...new Set([...tagged.tags, tag])] };
}
