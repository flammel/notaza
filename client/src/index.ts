import { makeApi } from './Api';
import { makeApp } from './views/App';
import { makeRenderer } from './Renderer';
import { AppState } from './types';
import { createStore } from './store/store';
import * as actions from './store/actions';

import './index.scss';
import { setUrl } from './store/actions';

const api = makeApi(window.localStorage.getItem('apiUri') ?? '');
const renderer = makeRenderer();

const initialState: AppState = {
    notifications: [],
    pages: [],
    query: '',
    urlId: '',
    editing: [],
    editedContent: '',
};

const store = createStore(
    initialState,
    on(actions.setPages, (state, action) => {
        action.pages
    })
);

document.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement && event.target.classList.contains('internal')) {
        event.preventDefault();
        const href = event.target.getAttribute('href');
        if (href) {
            window.history.pushState(null, href, href);
            store.dispatch(actions.setUrl({ url: href }));
        }
    }
});
window.addEventListener('popstate', () => {
    store.dispatch(actions.setUrl({ url: window.location.pathname }));
});

const app = makeApp(store);
document.getElementById('container')?.appendChild(app.element);
store.dispatch(actions.setUrl({ url: window.location.pathname }));
api.loadPages().then((pages) => store.dispatch(actions.setPages({ pages })));

// PWA

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/serviceWorker.js').then();
    });
}
