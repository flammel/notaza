import './index.scss';
import { AppView } from './App';
import { configureApi } from './Api';
import * as actions from './actions';
import { makeStore } from './store';
import { AppState } from './types';

const initialState: Readonly<AppState> = {
    pages: [],
    currentPage: '',
    editingId: undefined,
    notifications: [],
};
const store = makeStore(initialState, actions.reduce);
const app = AppView(store.dispatch);
store.subscribe((newState: AppState) => {
    app.update(newState);
});

const api = configureApi(window.localStorage.getItem('apiUri') ?? '');
api.loadPages().then((loadedPages) => {
    store.dispatch(actions.setPages(loadedPages));
    store.dispatch(actions.changeUrl(window.location.pathname.substring(1)));
});

document.getElementById('container')?.appendChild(app.element);

// PWA

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/serviceWorker.js').then();
    });
}
