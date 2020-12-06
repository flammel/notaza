import { GithubApi } from './api';
import { mountView } from './view';
import { Config, loadConfig } from './config';
import { observable } from './observable';
import { Page } from './model';
import { Store } from './store';
import { PageViewModel, SearchViewModel, pageViewModel, searchViewModel } from './viewModel';

import './index.scss';

function editLink(page: Page, config: Config): string {
    const baseUrl = `https://github.com/${config.user}/${config.repo}`;
    if (page.isNew) {
        return `${baseUrl}/new/master?filename=${page.id}.md`;
    } else {
        return `${baseUrl}/edit/master/${page.id}.md`;
    }
}

async function init(): Promise<void> {
    const config = await loadConfig();
    const api = new GithubApi(config.user, config.repo, config.token);
    const files = await api.loadFiles();
    const store = new Store(files);

    const currentPage$ = observable<PageViewModel>();
    const search$ = observable<SearchViewModel>();

    mountView(document.body, currentPage$, search$);
    const updateCurrentPage = (url: string): void => {
        currentPage$.next(pageViewModel(store, url === '' ? 'index' : url, (page) => editLink(page, config)));
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
