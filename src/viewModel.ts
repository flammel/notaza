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
                content: getFilteredContent(
                    other,
                    (element) => element.querySelector(`a[href='/#/${page.id}.md']`) !== null,
                ),
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

function getFilteredContent(page: Page, filter: (element: HTMLElement) => boolean): string {
    const doc = new DOMParser().parseFromString(notazamd().render(page.body), 'text/html');
    const ul = doc.createElement('ul');
    for (const $el of doc.querySelectorAll('body > ul > li, body > p')) {
        if ($el instanceof HTMLElement && filter($el)) {
            if ($el instanceof HTMLLIElement && filter($el)) {
                ul.appendChild($el);
            } else if ($el instanceof HTMLParagraphElement) {
                const li = doc.createElement('li');
                li.appendChild($el);
                ul.appendChild(li);
            }
        }
    }
    return ul.outerHTML;
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
            content: getFilteredContent(page, (element) =>
                element.innerText.toLowerCase().includes(query.toLowerCase()),
            ),
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
        results: [...pageResults, ...bookmarkResults, ...tweetResults],
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
