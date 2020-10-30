import { Bookmark, Page, Tweet } from './Page';
import { getBacklinks, containsReference, PageWithBacklinks } from './backlinks';
import { MarkdownRenderer } from './MarkdownRenderer';
import { getSearchResults } from './search';

interface RepoPage {
    page: Page;
    bookmarks: Bookmark[];
    tweets: Tweet[];
    backlinks: PageWithBacklinks[];
}

export class Repo {
    private pages: Page[] = [];
    private bookmarks: Bookmark[] = [];
    private tweets: Tweet[] = [];

    constructor(private readonly markdownRenderer: MarkdownRenderer) {}

    init(pages: Page[], bookmarks: Bookmark[], tweets: Tweet[]): void {
        this.bookmarks = bookmarks;
        this.tweets = tweets;

        const pageMap = new Map(pages.map((page) => [page.fileId, page]));
        const tags = new Set([...bookmarks.flatMap(({ tags }) => tags), ...tweets.flatMap(({ tags }) => tags)]);
        for (const tag of tags) {
            const page = pageMap.get(tag);
            if (page === undefined) {
                pageMap.set(tag, Page.fromFilename(tag + '.md'));
            }
        }
        this.pages = [...pageMap.values()];
    }

    public getPage(filename: string): RepoPage {
        const page = this.pages.find((page) => page.filename === filename) ?? Page.fromFilename(filename);
        const bookmarks = this.bookmarks.filter(
            (bookmark) => bookmark.tags.includes(page.fileId) || containsReference(bookmark.description, page),
        );
        const tweets = this.tweets.filter(
            (tweet) => tweet.tags.includes(page.fileId) || containsReference(tweet.tweet + tweet.notes, page),
        );
        return {
            page: page,
            bookmarks: bookmarks,
            tweets: tweets,
            backlinks: getBacklinks(this.markdownRenderer, this.pages, page),
        };
    }

    public search(query: string): Page[] {
        return getSearchResults(this.pages, query);
    }
}
