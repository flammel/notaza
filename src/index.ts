import { loadApiData } from './api';
import { mountView } from './view';
import { Config, loadConfig } from './config';
import { observable } from './observable';
import { Page } from './model';
import { initStore } from './store';
import { PageViewModel, SearchViewModel, pageViewModel, searchViewModel } from './viewModel';

import './index.scss';

function editLink(page: Page, config: Config): string {
    const baseUrl = `https://github.com/${config.user}/${config.repo}`;
    if (page.isNew) {
        return `${baseUrl}/new/master?filename=${page.filename}`;
    } else {
        return `${baseUrl}/edit/master/${page.filename}`;
    }
}

async function init(): Promise<void> {
    const config = await loadConfig();
    const apiData = await loadApiData(config.user, config.repo, config.token);
    const store = initStore(apiData);

    const currentPage$ = observable<PageViewModel>();
    const search$ = observable<SearchViewModel>();

    mountView(document.body, currentPage$, search$);
    const updateCurrentPage = (url: string): void => {
        currentPage$.next(pageViewModel(store, url === '' ? 'index.md' : url, (page) => editLink(page, config)));
    };
    const updateSearch = (query: string): void => {
        search$.next(searchViewModel(store, query));
    };
    window.addEventListener('hashchange', () => {
        updateCurrentPage(window.location.hash.substring(2));
    });

    window.addEventListener('queryChange', (event) => {
        if (event instanceof CustomEvent && typeof event.detail === 'string') {
            updateSearch(event.detail);
        }
    });

    updateCurrentPage(window.location.hash.substring(2));
}
init();
