import { Bookmark, Page, Tweet } from './Page';
import { getBacklinks, containsReference } from './backlinks';
import { MarkdownRenderer } from './MarkdownRenderer';
import { getSearchResults } from './search';
import { ApiData } from './api';
import { PageTree, PageViewModel, SearchViewModel, SearchResult, BookmarkViewModel, TweetViewModel } from './view';
import { parseBookmarks, parseTweets } from './toml';

function isChildOf(child: string, parent: string): boolean {
    return parent === child.split('.').slice(0, -2).join('.') + '.md';
}

function buildPageTree(pages: Page[]): PageTree[] {
    const trees: PageTree[] = [];
    const stack: PageTree[] = [];

    const sorted = pages.sort((a, b) => a.fileId.localeCompare(b.fileId));
    for (const page of sorted) {
        let top = stack.pop();
        const tree: PageTree = {
            filename: page.filename,
            title: page.title,
            children: [],
        };
        if (top !== undefined) {
            while (top && !isChildOf(page.filename, top.filename)) {
                top = stack.pop();
            }
            if (top) {
                top.children.push(tree);
                stack.push(top);
            } else {
                trees.push(tree);
            }
        }
        stack.push(tree);
    }

    return trees;
}

function bookmarkViewModel(markdownRenderer: MarkdownRenderer, bookmark: Bookmark): BookmarkViewModel {
    return {
        title: bookmark.title,
        tags: bookmark.tags,
        url: bookmark.url,
        date: bookmark.date,
        descriptionHtml: markdownRenderer.renderString(bookmark.description),
    }
}
function tweetViewModel(markdownRenderer: MarkdownRenderer, tweet: Tweet): TweetViewModel {
    return {
        url: tweet.url,
        userHandle: tweet.userHandle,
        date: tweet.date,
        tags: tweet.tags,
        tweet: tweet.tweet,
        notesHtml: markdownRenderer.renderString(tweet.notes),
    }
}

export class Repo {
    private readonly pages: Page[];
    private readonly bookmarks: Bookmark[];
    private readonly tweets: Tweet[];

    constructor(apiData: ApiData, private readonly markdownRenderer: MarkdownRenderer, private readonly editLink: (page: Page) => string) {
        this.bookmarks = parseBookmarks(apiData.bookmarks);
        this.tweets = parseTweets(apiData.tweets);
        const pages = new Map(
            apiData.pages.map((apiPage) => [apiPage.filename, new Page(apiPage.filename, true, apiPage.content)]),
        );
        [
            ...new Set(this.bookmarks.flatMap(({ tags }) => tags)),
            ...new Set(this.tweets.flatMap(({ tags }) => tags)),
        ].forEach((tag) => {
            const filename = `${tag}.md`;
            if (!pages.has(`${tag}.md`)) {
                pages.set(filename, Page.fromFilename(filename));
            }
        });
        this.pages = [...pages.values()];
    }

    public getPage(filename: string): PageViewModel {
        const page = this.pages.find((page) => page.filename === filename) ?? Page.fromFilename(filename);
        const bookmarks = this.bookmarks.filter(
            (bookmark) => bookmark.tags.includes(page.fileId) || containsReference(bookmark.description, page),
        );
        const tweets = this.tweets.filter(
            (tweet) => tweet.tags.includes(page.fileId) || containsReference(tweet.tweet + tweet.notes, page),
        );
        return {
            filename: page.filename,
            title: page.title,
            editLink: this.editLink(page),
            html: this.markdownRenderer.render(page),
            bookmarks: bookmarks.map((bookmark) => bookmarkViewModel(this.markdownRenderer, bookmark)),
            tweets: tweets.map((tweet) => tweetViewModel(this.markdownRenderer, tweet)),
            backlinks: getBacklinks(this.markdownRenderer, this.pages, page).map((backlink) => ({
                backlinks: backlink.backlinks.map(({ content }) => ({
                    contentHtml: this.markdownRenderer.renderTokens(content),
                })),
                filename: backlink.page.filename,
                title: backlink.page.title,
            })),
        };
    }

    public getPages(): Page[] {
        return this.pages;
    }

    public search(query: string): SearchViewModel {
        query = query.toLowerCase().trim();
        if (query === '') {
            return {query, results: []};
        }
        const pageResults: SearchResult[] = getSearchResults(this.pages, query).map((page) => ({
            type: 'page',
            page: {
                filename: page.filename,
                title: page.title,
                backlinks: []
            }
        }));
        const bookmarkResults: SearchResult[] = this.bookmarks.filter(
            (bookmark) =>
                bookmark.url.toLowerCase().includes(query) ||
                bookmark.title.toLowerCase().includes(query) ||
                bookmark.description.toLowerCase().includes(query) ||
                bookmark.tags.includes(query),
        ).map((bookmark) => ({
            type: 'bookmark',
            bookmark: bookmarkViewModel(this.markdownRenderer, bookmark)
        }));
        const tweetResults: SearchResult[] = this.tweets.filter(
            (tweet) =>
                tweet.url.toLowerCase().includes(query) ||
                tweet.tweet.toLowerCase().includes(query) ||
                tweet.notes.toLowerCase().includes(query) ||
                tweet.tags.includes(query),
        ).map((tweet) => ({
            type: 'tweet',
            tweet: tweetViewModel(this.markdownRenderer, tweet)
        }));
        return {
            query,
            results: [...pageResults, ...bookmarkResults, ...tweetResults]
        }
    }

    public pageTree(): PageTree[] {
        return buildPageTree(this.pages);
    }
}
