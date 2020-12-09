import { ApiFile, ApiFiles } from './api';
import { notazamd } from './markdown';
import { parseBookmarks, parseTweets } from './toml';
import { Bookmark, Tweet, Page, makePageFromFilename, makePage, Card, SearchResult } from './model';
import Token from 'markdown-it/lib/token';
import { memoize, withoutExtension } from './util';

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

const getFences = memoize((apiFiles: ApiFiles): Fence[] =>
    apiFiles
        .filter((apiFile) => apiFile.filename.endsWith('.md'))
        .flatMap((file) =>
            notazamd()
                .parse(file.content)
                .filter((token) => token.type === 'fence')
                .map((token) => ({ file, info: token.info.trim(), content: token.content })),
        ),
);

class PageRepository {
    private readonly pages: Map<string, Page>;
    private readonly aliases: Map<string, Page>;
    private static readonly memoizedGetBlocks = memoize(getBlocks);

    public constructor(apiFiles: ApiFiles) {
        this.pages = new Map(
            apiFiles
                .filter((apiFile) => apiFile.filename.endsWith('.md'))
                .map((apiFile) => makePage(apiFile.filename, apiFile.content))
                .map((page) => [page.filename, page]),
        );
        this.aliases = new Map(
            [...this.pages.values()].flatMap((page) => pageAliases(page).map((alias) => [alias, page])),
        );
    }

    public getAll(): Page[] {
        return [...this.pages.values()];
    }

    public getById(filename: string): Page | undefined {
        return this.pages.get(filename) ?? this.aliases.get(withoutExtension(filename));
    }

    public addIfMissing(page: Page): void {
        if (!this.getById(page.filename)) {
            this.pages.set(page.filename, page);
        }
    }

    public findRelated(page: Page): Card[] {
        return this.getAll()
            .filter((other) => other.filename !== page.filename && containsReference(other.body, page))
            .map((other) => ({
                type: 'page',
                url: other.filename,
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
                url: other.filename,
                title: other.title,
                tags: [],
                content: [PageRepository.getFilteredContent(other, (md) => md.toLocaleLowerCase().includes(query))],
            }));
    }

    private static searchInPage(query: string): (page: Page) => boolean {
        return (page: Page): boolean =>
            page.title.toLowerCase().includes(query) || page.body.toLowerCase().includes(query);
    }

    private static getFilteredContent(page: Page, filter: (md: string) => boolean): string {
        const blocks = PageRepository.memoizedGetBlocks(page).filter((block) =>
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
            .filter(
                (bookmark) =>
                    bookmark.tags.includes(withoutExtension(page.filename)) ||
                    containsReference(bookmark.description, page) ||
                    pageAliases(page).some((alias) => bookmark.tags.includes(alias)) ||
                    bookmark.id === withoutExtension(page.filename),
            )
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
                    tweet.tags.includes(withoutExtension(page.filename)) ||
                    containsReference(tweet.tweet, page) ||
                    containsReference(tweet.notes, page) ||
                    pageAliases(page).some((alias) => tweet.tags.includes(alias)) ||
                    tweet.userHandle === withoutExtension(page.filename),
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
    private readonly apiFiles: Map<string, ApiFile>;
    private pageRepo: PageRepository = new PageRepository([]);
    private bookmarkRepo: BookmarkRepository = new BookmarkRepository([]);
    private tweetRepo: TweetRepository = new TweetRepository([]);

    public constructor(apiFiles: ApiFiles) {
        this.apiFiles = new Map(apiFiles.map((apiFile) => [apiFile.filename, apiFile]));
        this.init();
    }

    private init(): void {
        const apiFiles = [...this.apiFiles.values()];
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
            url: page.filename,
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

    public update(filename: string, content: string): void {
        this.apiFiles.set(filename, { filename, content });
        this.init();
    }

    public getCss(): string[] {
        return getFences([...this.apiFiles.values()])
            .filter(({ info }) => info === 'notaza-css')
            .map(({ content }) => content);
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

function containsReference(str: string, page: Page): boolean {
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

function pageAliases(page: Page): string[] {
    return (
        page.frontMatter.aliases
            ?.split(' ')
            .map((alias) => alias.trim())
            .filter((alias) => alias !== '') ?? []
    );
}

function addTag<T extends { tags: string[] }>(tag: string, tagged: T): T {
    return { ...tagged, tags: [...new Set([...tagged.tags, tag])] };
}

function getBlocks(page: Page): Block[] {
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
    return blocks;
}
