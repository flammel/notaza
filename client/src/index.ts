import './index.scss';
import { makeApi } from './Api';
import { makeApp } from './views/App';
import { makeRenderer } from './Renderer';
import * as Bacon from 'baconjs';
import { Pages, Page, Notification, PageId } from './types';
import { dateToString } from './util';

function urlToId(url: string): PageId {
    if (url.startsWith('/')) {
        url = url.substring(1);
    }
    if (url.startsWith('./')) {
        url = url.substring(2);
    }
    if (url === '') {
        return dateToString(new Date());
    }
    return url;
}

const api = makeApi(window.localStorage.getItem('apiUri') ?? '');
const renderer = makeRenderer();
const loadedPages$ = new Bacon.Bus<Pages>();
const savedPages$ = new Bacon.Bus<Page>();
const pages$ = Bacon.update<Pages>(
    [],
    [loadedPages$, (_prev, loaded): Pages => loaded],
    [savedPages$, (prev, saved): Pages => prev.filter((page) => page.id !== saved.id).concat([saved])],
);
const url$ = new Bacon.Bus<string>();
const route$ = url$
    .map((url) => ({
        pageId: urlToId(url),
        editing: false,
    }))
    .toProperty();
route$.onValue((val) => console.log(val));

// Global event handlers

document.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement && event.target.classList.contains('internal')) {
        event.preventDefault();
        const href = event.target.getAttribute('href');
        if (href) {
            window.history.pushState(null, href, href);
            url$.push(href);
        }
    }
});
window.addEventListener('popstate', () => {
    url$.push(window.location.pathname);
});

const renderPage = (page: Page): string => {
    return `<h1>${page.title}</h1>${renderer.render(page.markdown)}`;
};
const savePage = (page: Page, notify: (notification: Notification) => void): void => {
    api.savePage(page)
        .then((newPage) => {
            notify({
                type: 'success',
                message: 'saved',
            });
            savedPages$.push(newPage);
        })
        .catch(() => {
            notify({
                type: 'error',
                message: 'failed',
            });
        });
};
const refreshBacklinks = (notify: (notification: Notification) => void): void => {
    api.refreshBacklinks()
        .then(() => notify({ type: 'success', message: 'refreshed' }))
        .catch(() => notify({ type: 'error', message: 'refresh failed' }));
};

const app = makeApp(pages$, route$, renderPage, savePage, refreshBacklinks);
document.getElementById('container')?.appendChild(app.element);
url$.push(window.location.pathname);
api.loadPages().then((pages) => loadedPages$.push(pages));

// PWA

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/serviceWorker.js').then();
    });
}
