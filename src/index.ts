import { GithubApi } from './api';
import { mountView } from './view';
import { loadConfig } from './config';
import { observable } from './observable';
import { makeStore, Store } from './store';
import { PageViewModel, SearchViewModel, pageViewModel, searchViewModel } from './viewModel';
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

    const currentPage$ = observable<PageViewModel>();
    const search$ = observable<SearchViewModel>();
    const appEvents$ = observable<AppEvent>();

    applyStyles(store);

    mountView(document.body, currentPage$, search$, appEvents$);
    const updateCurrentPage = (url: string, editing: boolean): void => {
        currentPage$.next(pageViewModel(store, url === '' ? 'index.md' : url, editing));
    };
    const updateSearch = (query: string): void => {
        search$.next(searchViewModel(store, query));
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
