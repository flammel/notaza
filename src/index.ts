import { MarkdownRenderer } from './MarkdownRenderer';
import { Api } from './Api';
import { View } from './View';
import { loadConfig } from './config';

import './index.scss';
import { Page } from './Page';

const config = loadConfig();
if (config !== undefined) {
    const api = new Api(config.user, config.repo, config.token);
    const view = new View(
        document.getElementById('container') as HTMLElement,
        new MarkdownRenderer(),
        window.location.hash.substring(2),
        (page: Page) => {
            const baseUrl = `https://github.com/${config.user}/${config.repo}`;
            if (page.version === undefined) {
                return `${baseUrl}/new/master?filename=${page.filename}`;
            } else {
                return `${baseUrl}/edit/master/${page.filename}`;
            }
        },
    );

    api.loadPages().then((pages) => {
        view.setPages(pages);
    });

    window.addEventListener('hashchange', () => {
        view.setUrl(window.location.hash.substring(2));
    });
}
