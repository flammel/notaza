var _a, _b;
import './index.scss';
import { makeApi } from './Api';
import { makeApp } from './views/App';
import { makeRenderer } from './Renderer';
import * as Bacon from 'baconjs';
import { dateToString } from './util';
function urlToId(url) {
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
const api = makeApi((_a = window.localStorage.getItem('apiUri')) !== null && _a !== void 0 ? _a : '');
const renderer = makeRenderer();
const loadedPages$ = new Bacon.Bus();
const savedPages$ = new Bacon.Bus();
const pages$ = Bacon.update([], [loadedPages$, (_prev, loaded) => loaded], [
    savedPages$,
    (prev, saved) => {
        const savedIds = new Set(saved.map((page) => page.id));
        return prev.filter((page) => !savedIds.has(page.id)).concat(saved);
    },
]);
const url$ = new Bacon.Bus();
const route$ = url$
    .map((url) => ({
    pageId: urlToId(url),
    editing: false,
}))
    .toProperty();
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
const renderPage = (page) => {
    return `<h1>${page.title}</h1>`;
};
const savePage = (page, notify) => {
    api.savePage(page)
        .then((updated) => {
        notify({
            type: 'success',
            message: 'saved',
        });
        savedPages$.push(updated);
    })
        .catch(() => {
        notify({
            type: 'error',
            message: 'failed',
        });
    });
};
const app = makeApp(pages$, route$, renderPage, savePage);
(_b = document.getElementById('container')) === null || _b === void 0 ? void 0 : _b.appendChild(app.element);
url$.push(window.location.pathname);
api.loadPages().then((pages) => loadedPages$.push(pages));
// PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/serviceWorker.js').then();
    });
}
//# sourceMappingURL=index.js.map