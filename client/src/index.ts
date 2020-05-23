import './index.scss';
import { makeApi } from './Api';
import { makeApp } from './App';
import { makeRenderer } from './Renderer';
import * as Bacon from 'baconjs';
import { Pages, Page } from './types';

const api = makeApi(window.localStorage.getItem('apiUri') ?? '');
const renderer = makeRenderer();
const loadedPages$ = new Bacon.Bus<Pages>();
const savedPages$ = new Bacon.Bus<Page>();
const pages$ = Bacon.combine(
    loadedPages$,
    savedPages$,
    (pages, savedPage): Pages => pages.map((page) => (page.id === savedPage.id ? savedPage : page)),
);
api.loadPages().then((pages) => loadedPages$.push(pages));

const app = makeApp(
    renderer,
    Bacon.mergeAll([loadedPages$.first(), pages$]),
    (page, notify) =>
        api
            .savePage(page)
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
            }),
    (notify) =>
        api
            .refreshBacklinks()
            .then(() => notify({ type: 'success', message: 'refreshed' }))
            .catch(() => notify({ type: 'error', message: 'refresh failed' })),
);
document.getElementById('container')?.appendChild(app.element);

// PWA

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/serviceWorker.js').then();
    });
}
