import { ApiData } from './api';
import { notazamd } from './markdown';
import { Bookmark, makePage, makePageFromFilename, Page, Tweet } from './model';
import { parseBookmarks, parseTweets } from './toml';

export interface Store {
    readonly pages: Page[];
    readonly bookmarks: Bookmark[];
    readonly tweets: Tweet[];
}

export function initStore(apiData: ApiData): Store {
    const rawPages = apiData.pages.map((apiPage): [string, Page] => [
        apiPage.filename,
        makePage(apiPage.filename, false, apiPage.content),
    ]);
    const fences = rawPages.flatMap(([, page]) =>
        notazamd()
            .parse(page.body)
            .filter((token) => token.type === 'fence')
            .map((token) => [token.info.trim(), token.content]),
    );
    const bookmarksInPages = fences.filter(([info]) => info === 'bookmark').map(([, content]) => content);
    const bookmarks = parseBookmarks(apiData.bookmarks + '\n' + bookmarksInPages.join('\n'));
    const tweetsInPages = fences.filter(([info]) => info === 'tweet').map(([, content]) => content);
    const tweets = parseTweets(apiData.tweets + '\n' + tweetsInPages.join('\n'));
    const pages = new Map<string, Page>([
        ...bookmarks
            .flatMap(({ tags }) => tags)
            .map((tag): [string, Page] => [`${tag}.md`, makePageFromFilename(`${tag}.md`)]),
        ...tweets
            .flatMap(({ tags }) => tags)
            .map((tag): [string, Page] => [`${tag}.md`, makePageFromFilename(`${tag}.md`)]),
        ...rawPages,
    ]);
    return {
        pages: [...pages.values()],
        bookmarks,
        tweets,
    };
}
