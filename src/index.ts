import { MarkdownRenderer } from './MarkdownRenderer';
import { Api } from './Api';
import { mountView, PageViewModel, SidebarViewModel, PageTree } from './view';
import { Page } from './Page';
import { Config, loadConfig } from './config';
import { observable } from './observable';
import { Repo } from './repo';

import './index.scss';

function isChildOf(child: string, parent: string): boolean {
    return parent === child.split('.').slice(0, -2).join('.') + '.md';
}

function buildPageTree(repo: Repo, query: string): PageTree[] {
    const pages = repo.search(query);
    if (query !== '') {
        return pages.map((result) => ({
            filename: result.filename,
            title: result.title,
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
    repo: Repo,
    markdownRenderer: MarkdownRenderer,
    config: Config,
    filename: string,
): PageViewModel {
    const page = repo.getPage(filename);
    return {
        filename: page.page.filename,
        title: page.page.title,
        editLink: editLink(page.page, config),
        html: markdownRenderer.render(page.page),
        bookmarks: page.bookmarks.map((bookmark) => ({
            title: bookmark.title,
            tags: bookmark.tags,
            url: bookmark.url,
            date: bookmark.date,
            descriptionHtml: markdownRenderer.renderString(bookmark.description),
        })),
        tweets: page.tweets.map((tweet) => ({
            url: tweet.url,
            userHandle: tweet.userHandle,
            date: tweet.date,
            tags: tweet.tags,
            tweet: tweet.tweet,
            notesHtml: markdownRenderer.renderString(tweet.notes),
        })),
        backlinks: page.backlinks.map((pageWithBacklinks) => ({
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
    const repo = new Repo(markdownRenderer);
    let query: string = '';
    const updateCurrentPage = (): void => {
        currentPage$.next(getCurrentPage(repo, markdownRenderer, config, window.location.hash.substring(2)));
    };
    const updateSidebar = (): void => {
        sidebar$.next({
            trees: buildPageTree(repo, query),
        });
    };

    mountView(document.body, currentPage$, sidebar$);

    Promise.all([api.loadPages(), api.fetchBookmarks(), api.fetchTweets()]).then(([pages, bookmarks, tweets]) => {
        repo.init(pages, bookmarks, tweets);
        updateSidebar();
        updateCurrentPage();
    });

    window.addEventListener('hashchange', () => {
        updateSidebar();
        updateCurrentPage();
    });

    window.addEventListener('queryChange', (event) => {
        if (event instanceof CustomEvent && typeof event.detail === 'string') {
            query = event.detail;
            updateSidebar();
        }
    });
}

const config = loadConfig();
if (config !== undefined) {
    init(config);
}
