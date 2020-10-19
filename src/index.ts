import { MarkdownRenderer } from './MarkdownRenderer';
import { Api } from './Api';
import { View } from './View';
import { Page } from './Page';
import { loadConfig } from './config';

import './index.scss';

const config = loadConfig();
if (config !== undefined) {
    const api = new Api(config.user, config.repo, config.token);
    const $container = document.createElement('div');
    document.body.insertAdjacentElement('afterbegin', $container);
    const view = new View($container, new MarkdownRenderer(), window.location.hash.substring(2), (page: Page) => {
        const baseUrl = `https://github.com/${config.user}/${config.repo}`;
        if (page.version === undefined) {
            return `${baseUrl}/new/master?filename=${page.filename}`;
        } else {
            return `${baseUrl}/edit/master/${page.filename}`;
        }
    });

    api.loadPages().then((pages) => {
        view.setPages(pages);
    });

    api.fetchBookmarks().then((bookmarks) => view.setBookmarks(bookmarks));

    api.fetchTweets().then((teweets) => view.setTweets(teweets));

    window.addEventListener('hashchange', () => {
        view.setUrl(window.location.hash.substring(2));
    });
}
