import { Page } from './model';
import { Bookmark, Tweet } from './model';
import { Store } from './store';

export function containsReference(str: string, page: Page): boolean {
    return (
        str.toLocaleLowerCase().includes('](./' + page.filename.toLocaleLowerCase() + ')') ||
        str.toLocaleLowerCase().includes('](./' + page.filename.toLocaleLowerCase().slice(0, -3) + ')') ||
        str.toLocaleLowerCase().includes('#' + page.filename.toLocaleLowerCase().slice(0, -3)) ||
        str.toLocaleLowerCase().includes('[[' + page.title.toLocaleLowerCase() + ']]')
    );
}

interface PageResult {
    type: 'page';
    page: Page;
}
interface TweetResult {
    type: 'tweet';
    tweet: Tweet;
}
interface BookmarkResult {
    type: 'bookmark';
    bookmark: Bookmark;
}
type SearchResult = PageResult | TweetResult | BookmarkResult;

export function search(store: Store, query: string): SearchResult[] {
    query = query.toLowerCase().trim();
    if (query.length < 2) {
        return [];
    }
    const pageResults: SearchResult[] = store.pages
        .filter((page) => page.title.toLowerCase().includes(query) || page.body.toLowerCase().includes(query))
        .map((page) => ({
            type: 'page',
            page: page,
        }));
    const bookmarkResults: SearchResult[] = store.bookmarks
        .filter(
            (bookmark) =>
                bookmark.url.toLowerCase().includes(query) ||
                bookmark.title.toLowerCase().includes(query) ||
                bookmark.description.toLowerCase().includes(query) ||
                bookmark.tags.includes(query),
        )
        .map((bookmark) => ({
            type: 'bookmark',
            bookmark,
        }));
    const tweetResults: SearchResult[] = store.tweets
        .filter(
            (tweet) =>
                tweet.url.toLowerCase().includes(query) ||
                tweet.tweet.toLowerCase().includes(query) ||
                tweet.notes.toLowerCase().includes(query) ||
                tweet.tags.includes(query),
        )
        .map((tweet) => ({
            type: 'tweet',
            tweet,
        }));
    return [...pageResults, ...bookmarkResults, ...tweetResults];
}
