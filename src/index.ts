import { GithubApi } from './api';
import { mountView } from './view';
import { loadConfig } from './config';
import { observable } from './observable';
import { Store } from './store';
import { PageViewModel, SearchViewModel, pageViewModel, searchViewModel } from './viewModel';

import './index.scss';
import { hasOwnProperty } from './util';

async function init(): Promise<void> {
    const config = await loadConfig();
    const api = new GithubApi(config.user, config.repo, config.token);
    const files = await api.loadFiles();
    const store = new Store(files);

    const currentPage$ = observable<PageViewModel>();
    const search$ = observable<SearchViewModel>();

    mountView(document.body, currentPage$, search$);
    const updateCurrentPage = (url: string, editing: boolean): void => {
        currentPage$.next(pageViewModel(store, url === '' ? 'index.md' : url, editing));
    };
    const updateSearch = (query: string): void => {
        search$.next(searchViewModel(store, query));
    };
    window.addEventListener('hashchange', () => {
        updateCurrentPage(window.location.hash.substring(2), false);
    });

    window.addEventListener('queryChange', (event) => {
        if (event instanceof CustomEvent && typeof event.detail === 'string') {
            updateSearch(event.detail);
        }
    });

    window.addEventListener('editClick', (event) => {
        if (event instanceof CustomEvent && typeof event.detail === 'string') {
            updateCurrentPage(event.detail, true);
        }
    });

    window.addEventListener('saveClick', (event) => {
        if (event instanceof CustomEvent && typeof event.detail === 'object') {
            const filename = hasOwnProperty(event.detail, 'filename') ? event.detail.filename : undefined;
            const content = hasOwnProperty(event.detail, 'content') ? event.detail.content : undefined;
            if (filename !== undefined && content !== undefined) {
                api.updateFile(filename, content)
                    .then(() => {
                        store.update(filename, content);
                        updateCurrentPage(event.detail.filename, false);
                    })
                    .catch(() => alert('Update failed'));
            }
        }
    });

    updateCurrentPage(window.location.hash.substring(2), false);
}
init();
