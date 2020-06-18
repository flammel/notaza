import { makeApi } from './Api';
import { AppView } from './views/App';
import { State } from './types';
import * as actions from './actions';

import './index.scss';
import { Store } from './store';

const api = makeApi(window.localStorage.getItem('apiUri') ?? '');

const initialState: State = {
    notifications: [],
    pages: [],
    sidebar: {
        query: '',
    },
    activePageId: undefined,
    editing: undefined,
};

const store = new Store(initialState);

document.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement && event.target.classList.contains('internal')) {
        event.preventDefault();
        const href = event.target.getAttribute('href');
        if (href) {
            window.history.pushState(null, href, href);
            store.dispatch(actions.onUrlChange(href));
        }
    }
});
window.addEventListener('popstate', () => {
    store.dispatch(actions.onUrlChange(window.location.pathname));
});

document.getElementById('container')?.appendChild(new AppView(store));
store.dispatch(actions.onUrlChange(window.location.pathname));
api.loadPages().then((pages) => store.dispatch(actions.onPagesLoaded(pages)));

// PWA

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/serviceWorker.js').then();
    });
}
