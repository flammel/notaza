import { Api } from './service/Api';
import { PageParser } from './service/PageParser';
import { BlockRenderer } from './service/BlockRenderer';

import './index.scss';
import { AppView } from './views/App';
import { PageId, Page, Block } from './types';

const pageParser = new PageParser();
const blockRenderer = new BlockRenderer();
const api = new Api(window.localStorage.getItem('apiUri') ?? '', pageParser);
const store: { pages: Page[] } = { pages: [] };

const $container = document.getElementById('container') as HTMLElement;
const appView = new AppView(
    $container,
    (block: Block) => blockRenderer.render(block),
    (id: PageId, rawMarkdown: string) => {
        api.savePage(id, rawMarkdown).then(() => {
            store.pages = store.pages.map((page) => (page.id === id ? pageParser.parse(id, rawMarkdown) : page));
            appView.setPages(store.pages);
        });
    },
);
appView.setUrl(window.location.pathname.slice(1));

api.loadPages().then((pages) => {
    store.pages = pages;
    appView.setPages(store.pages);
});

document.addEventListener('click', (event) => {
    if (
        event.target instanceof HTMLAnchorElement &&
        !event.target.getAttribute('href')?.startsWith('http://') &&
        !event.target.getAttribute('href')?.startsWith('https://')
    ) {
        event.preventDefault();
        const href = event.target.getAttribute('href');
        if (href) {
            window.history.pushState(null, href, href);
            appView.setUrl(window.location.pathname.slice(1));
        }
    }
});

window.addEventListener('popstate', () => {
    appView.setUrl(window.location.pathname.slice(1));
});

// PWA

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/serviceWorker.js').then();
    });
}
