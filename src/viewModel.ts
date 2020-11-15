import { notazamd } from './markdown';
import { Bookmark, makePageFromFilename, Page, Tweet } from './model';
import { search } from './search';
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
                content: getFilteredContent(other, (element) => element.querySelector(`a[href='/#/${page.id}.md']`) !== null),
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
    return {
        query: query,
        results: search(store, query).map((result) => {
            if (result.type === 'bookmark') {
                return {
                    type: 'bookmark',
                    bookmark: bookmarkViewModel(result.bookmark),
                };
            } else if (result.type === 'tweet') {
                return {
                    type: 'tweet',
                    tweet: tweetViewModel(result.tweet),
                };
            } else {
                return {
                    type: 'page',
                    page: {
                        filename: result.page.filename,
                        title: result.page.title,
                        content: getFilteredContent(result.page, (element) =>
                            element.innerText.toLowerCase().includes(query.toLowerCase()),
                        ),
                    },
                };
            }
        }),
    };
}

function bookmarkViewModel(bookmark: Bookmark): BookmarkViewModel {
    return {
        title: bookmark.title,
        tags: bookmark.tags,
        url: bookmark.url,
        date: bookmark.date,
        descriptionHtml: notazamd().render(bookmark.description),
    };
}

function tweetViewModel(tweet: Tweet): TweetViewModel {
    return {
        url: tweet.url,
        userHandle: userHandle(tweet),
        date: tweet.date,
        tags: tweet.tags,
        tweet: tweet.tweet,
        notesHtml: notazamd().render(tweet.notes),
    };
}

function userHandle(tweet: Tweet): string {
    const match = tweet.url.match(/^https:\/\/twitter\.com\/([^\/]+)\/.*$/);
    return match ? match[1] : tweet.url;
}
