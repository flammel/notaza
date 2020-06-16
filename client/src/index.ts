import { makeApi } from './Api';
import { AppView } from './views/App';
import { AppState } from './types';
import { createStore } from './store/store';
import * as actions from './store/actions';
import { reducers } from './store/reducers';

import './index.scss';

const api = makeApi(window.localStorage.getItem('apiUri') ?? '');

const initialState: AppState = {
    notifications: [],
    pages: [],
    sidebar: {
        query: '',
    },
    activePageId: undefined,
    editing: undefined,
};

const store = createStore(initialState, ...reducers);

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

document.getElementById('container')?.appendChild(new AppView(store));
store.dispatch(actions.setUrl({ url: window.location.pathname }));
api.loadPages().then((pages) => store.dispatch(actions.setPages({ pages })));

// PWA

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/serviceWorker.js').then();
    });
}
