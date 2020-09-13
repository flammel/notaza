import { MarkdownRenderer } from './MarkdownRenderer';
import { Api } from './Api';
import { View } from './View';

import './index.scss';

const api = new Api(window.localStorage.getItem('apiUri') ?? '');
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
