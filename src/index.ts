import { GithubApi } from './api';
import { mountView, ViewState } from './view';
import { loadConfig } from './config';
import { observable } from './observable';
import { makeStore, Store } from './store';
import { pageViewModel } from './viewModel';
import { assertNever } from './util';
import { AppEvent } from './event';
import { tweetProvider } from './DataProvider/tweet';
import { pageProvider } from './DataProvider/page';
import { bookmarkProvider } from './DataProvider/bookmark';

import './index.scss';

const $style = document.createElement('style');
document.head.appendChild($style);
function applyStyles(store: Store): void {
    $style.innerHTML = store.styles().join('\n');
}

async function init(): Promise<void> {
    const config = await loadConfig();
    const api = new GithubApi(config.user, config.repo, config.token);
    const files = await api.loadFiles();
    const store = makeStore([pageProvider(files), tweetProvider(files), bookmarkProvider(files)]);

    const viewState$ = observable<ViewState>();
    const appEvents$ = observable<AppEvent>();

    applyStyles(store);

    mountView(document.body, viewState$, appEvents$);
    const updateCurrentPage = (url: string, editing: boolean): void => {
        const pvm = pageViewModel(store, url === '' ? 'index.md' : url, editing);
        if (editing) {
            viewState$.next({
                type: 'edit',
                filename: pvm.filename,
                content: pvm.raw,
            });
        } else {
            viewState$.next({
                type: 'show',
                page: pvm,
            });
        }
    };
    const updateSearch = (query: string): void => {
        viewState$.next({
            type: 'search',
            query: query,
            results: store.search(query.toLowerCase().trim()),
        });
    };
    window.addEventListener('hashchange', () => {
        updateCurrentPage(window.location.hash.substring(2), false);
    });

    appEvents$.subscribe((event) => {
        switch (event.type) {
            case 'queryChange':
                updateSearch(event.query);
                break;
            case 'editClick':
                updateCurrentPage(event.filename, true);
                break;
            case 'saveClick':
                api.updateFile(event.filename, event.content)
                    .then(() => {
                        store.update(event.filename, event.content);
                        updateCurrentPage(event.filename, false);
                        applyStyles(store);
                    })
                    .catch(() => alert('Update failed'));
                break;
            case 'cancelClick':
                updateCurrentPage(event.filename, false);
                break;
            default:
                assertNever(event);
        }
    });

    updateCurrentPage(window.location.hash.substring(2), false);
}
init();
