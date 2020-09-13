import { MarkdownRenderer } from './MarkdownRenderer';
import { Api } from './Api';
import { View } from './View';

import './index.scss';

declare global {
    interface Window {
        __NOTAZA_API_URL: string;
        __NOTAZA_EDIT_LINK: (filename: string) => string;
    }
}

const api = new Api(window.__NOTAZA_API_URL);
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
