import { ApiData } from './api';
import { Bookmark, makePage, makePageFromFilename, Page, Tweet } from './model';
import { parseBookmarks, parseTweets } from './toml';

export interface Store {
    readonly pages: Page[];
    readonly bookmarks: Bookmark[];
    readonly tweets: Tweet[];
}

export function initStore(apiData: ApiData): Store {
    const bookmarks = parseBookmarks(apiData.bookmarks);
    const tweets = parseTweets(apiData.tweets);
    const pages = new Map<string, Page>([
        ...bookmarks
            .flatMap(({ tags }) => tags)
            .map((tag): [string, Page] => [`${tag}.md`, makePageFromFilename(`${tag}.md`)]),
        ...tweets
            .flatMap(({ tags }) => tags)
            .map((tag): [string, Page] => [`${tag}.md`, makePageFromFilename(`${tag}.md`)]),
        ...apiData.pages.map((apiPage): [string, Page] => [
            apiPage.filename,
            makePage(apiPage.filename, false, apiPage.content),
        ]),
    ]);
    return {
        pages: [...pages.values()],
        bookmarks,
        tweets,
    };
}
