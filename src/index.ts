import { MarkdownRenderer } from './MarkdownRenderer';
import { Api } from './Api';
import { mountView, PageViewModel, SidebarViewModel, PageTree } from './view';
import { Bookmark, Page, Tweet } from './Page';
import { Config, loadConfig } from './config';
import { observable } from './observable';
import { getSearchResults } from './search';
import { getBacklinks } from './backlinks';

import './index.scss';

function findPage(pages: Page[], url: string): Page {
    const found = pages.find((page) => page.filename === url);
    if (found === undefined) {
        const title = url.slice(0, -3);
        return new Page(url, undefined, `---\ntitle:${title}\n---\n`);
    } else {
        return found;
    }
}
function isChildOf(child: string, parent: string): boolean {
    return parent === child.split('.').slice(0, -2).join('.') + '.md';
}

function buildPageTree(pages: Page[], query: string): PageTree[] {
    if (query !== '') {
        return getSearchResults(pages, query).map((result) => ({
            filename: result.page.filename,
            title: result.page.title,
            children: [],
        }));
    }

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

function editLink(page: Page, config: Config): string {
    const baseUrl = `https://github.com/${config.user}/${config.repo}`;
    if (page.version === undefined) {
        return `${baseUrl}/new/master?filename=${page.filename}`;
    } else {
        return `${baseUrl}/edit/master/${page.filename}`;
    }
}

function getCurrentPage(
    pages: Page[],
    bookmarks: Bookmark[],
    tweets: Tweet[],
    markdownRenderer: MarkdownRenderer,
    config: Config,
    filename: string,
): PageViewModel {
    const page = findPage(pages, filename);
    return {
        filename: page.filename,
        title: page.title,
        editLink: editLink(page, config),
        html: markdownRenderer.render(page),
        bookmarks: bookmarks
            .filter((bookmark) => {
                const description = bookmark.description.toLocaleLowerCase();
                return (
                    bookmark.tags.includes(page.fileId) ||
                    description.includes('](./' + page.filename.toLocaleLowerCase() + ')') ||
                    description.includes('](./' + page.fileId + ')') ||
                    description.includes('#' + page.fileId) ||
                    description.includes('[[' + page.title.toLocaleLowerCase() + ']]')
                );
            })
            .map((bookmark) => ({
                title: bookmark.title,
                tags: bookmark.tags,
                url: bookmark.url,
                date: bookmark.date,
                descriptionHtml: markdownRenderer.renderString(bookmark.description),
            })),
        tweets: tweets
            .filter((tweet) => {
                const description = (tweet.tweet + tweet.notes).toLocaleLowerCase();
                return (
                    tweet.tags.includes(page.fileId) ||
                    description.includes('](./' + page.filename.toLocaleLowerCase() + ')') ||
                    description.includes('](./' + page.fileId + ')') ||
                    description.includes('#' + page.fileId) ||
                    description.includes('[[' + page.title.toLocaleLowerCase() + ']]')
                );
            })
            .map((tweet) => ({
                url: tweet.url,
                userHandle: tweet.userHandle,
                date: tweet.date,
                tags: tweet.tags,
                tweet: tweet.tweet,
                notesHtml: markdownRenderer.renderString(tweet.notes),
            })),
        backlinks: getBacklinks(markdownRenderer, pages, page).map((pageWithBacklinks) => ({
            title: pageWithBacklinks.page.title,
            filename: pageWithBacklinks.page.filename,
            backlinks: pageWithBacklinks.backlinks.map((backlink) => ({
                contentHtml: markdownRenderer.renderTokens(backlink.content),
            })),
        })),
    };
}

function init(config: Config): void {
    const api = new Api(config.user, config.repo, config.token);
    const markdownRenderer = new MarkdownRenderer();
    const currentPage$ = observable<PageViewModel>();
    const sidebar$ = observable<SidebarViewModel>();
    let pages: Page[] = [];
    let bookmarks: Bookmark[] = [];
    let tweets: Tweet[] = [];
    let query: string = '';
    const updateCurrentPage = (): void => {
        currentPage$.next(
            getCurrentPage(pages, bookmarks, tweets, markdownRenderer, config, window.location.hash.substring(2)),
        );
    };
    const updateSidebar = (): void => {
        sidebar$.next({
            trees: buildPageTree(pages, query),
        });
    };

    mountView(document.body, currentPage$, sidebar$);

    api.loadPages().then((loadedPages) => {
        pages = loadedPages;
        updateSidebar();
        updateCurrentPage();
    });

    api.fetchBookmarks().then((loadedBookmarks) => {
        bookmarks = loadedBookmarks;
        updateCurrentPage();
    });

    api.fetchTweets().then((loadedTweets) => {
        tweets = loadedTweets;
        updateCurrentPage();
    });

    window.addEventListener('hashchange', () => {
        updateSidebar();
        updateCurrentPage();
    });

    window.addEventListener('queryChange', (event) => {
        console.log(event);
        if (event instanceof CustomEvent) {
            if (typeof event.detail === 'string') {
                query = event.detail;
                updateSidebar();
            }
        }
    });
}

const config = loadConfig();
if (config !== undefined) {
    init(config);
}
