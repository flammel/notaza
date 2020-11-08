import { MarkdownRenderer } from './MarkdownRenderer';
import { loadApiData } from './api';
import { mountView, PageViewModel, SearchViewModel, SidebarViewModel } from './view';
import { Config, loadConfig } from './config';
import { observable } from './observable';
import { Repo } from './repo';
import { Page } from './Page';

import './index.scss';

function editLink(page: Page, config: Config): string {
    const baseUrl = `https://github.com/${config.user}/${config.repo}`;
    if (page.isNew) {
        return `${baseUrl}/new/master?filename=${page.filename}`;
    } else {
        return `${baseUrl}/edit/master/${page.filename}`;
    }
}

loadConfig()
    .then((config) => 
        loadApiData(config.user, config.repo, config.token).then((apiData) => ({config, apiData}))
    )
    .then(({config, apiData}) => {
        const markdownRenderer = new MarkdownRenderer();
        const repo = new Repo(apiData, markdownRenderer, (page) => editLink(page, config));
        const currentPage$ = observable<PageViewModel>();
        const sidebar$ = observable<SidebarViewModel>();
        const search$ = observable<SearchViewModel>();
        const updateCurrentPage = (url: string) => {
            if (url !== '') {
                currentPage$.next(repo.getPage(url));
            }
        };
        const updateSearch = (query: string) => {
            search$.next(repo.search(query));
        };

        mountView(document.body, currentPage$, sidebar$, search$);

        window.addEventListener('hashchange', () => {
            updateCurrentPage(window.location.hash.substring(2));
        });

        window.addEventListener('queryChange', (event) => {
            if (event instanceof CustomEvent && typeof event.detail === 'string') {
                updateSearch(event.detail);
            }
        });

        updateCurrentPage(window.location.hash.substring(2));
        sidebar$.next({trees: repo.pageTree()});
    });
