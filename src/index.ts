import { githubApi } from './api';
import { mountView, ViewState } from './view';
import { loadConfig } from './config';
import { observable } from './observable';
import { getOrMakeCard, makeStore, Store } from './store';
import { assertNever } from './util';
import { AppEvent } from './event';
import { tweetProvider } from './DataProvider/tweet';
import { pageProvider } from './DataProvider/page';
import { bookmarkProvider } from './DataProvider/bookmark';

import './index.scss';
import { notazamd } from './markdown';

const $style = document.createElement('style');
document.head.appendChild($style);
function applyStyles(store: Store): void {
    $style.innerHTML = store.styles().join('\n');
}

async function init(): Promise<void> {
    const config = await loadConfig();
    const api = githubApi(config.user, config.repo, config.token);
    const files = await api.loadFiles();
    const store = makeStore([
        pageProvider(files, notazamd().render),
        tweetProvider(files, notazamd().render),
        bookmarkProvider(files, notazamd().render),
    ]);

    const viewState$ = observable<ViewState>();
    const appEvents$ = observable<AppEvent>();

    applyStyles(store);

    mountView(document.body, viewState$, appEvents$);
    const updateCurrentPage = (url: string): void => {
        const filename = url.replace('#/', '').replace('?edit', '');
        const editing = url.endsWith('?edit');
        if (editing) {
            const file = files.find((file) => file.filename === filename);
            viewState$.next({
                type: 'edit',
                filename: filename,
                content: file?.content ?? '',
            });
        } else {
            const card = getOrMakeCard(store, filename);
            viewState$.next({
                type: 'show',
                card: card,
                related: store.related(card),
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
        updateCurrentPage(window.location.hash);
    });

    appEvents$.subscribe((event) => {
        switch (event.type) {
            case 'queryChange':
                updateSearch(event.query);
                break;
            case 'saveClick':
                api.updateFile(event.filename, event.content)
                    .then(() => {
                        store.update(event.filename, event.content);
                        window.location.hash = '/' + event.filename;
                        applyStyles(store);
                    })
                    .catch(() => alert('Update failed'));
                break;
            default:
                assertNever(event);
        }
    });

    updateCurrentPage(window.location.hash);
}
init();
