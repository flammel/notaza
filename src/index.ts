import { MarkdownRenderer } from './MarkdownRenderer';
import { Api } from './Api';
import { View } from './View';
import { loadConfig } from './config';

import './index.scss';

const config = loadConfig();
if (config !== undefined) {
    const api = new Api(config.user, config.repo, config.token);
    const view = new View(
        document.getElementById('container') as HTMLElement,
        new MarkdownRenderer(),
        window.location.hash.substring(2),
    );

    api.loadPages().then((pages) => {
        view.setPages(pages);
    });

    window.addEventListener('hashchange', () => {
        view.setUrl(window.location.hash.substring(2));
    });
}
