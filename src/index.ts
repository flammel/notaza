import { githubApi } from './api';
import { mountView, ViewState } from './view';
import { loadConfig } from './config';
import { observable } from './observable';
import { getOrMakeCard, makeStore } from './store';
import { assertNever } from './util';
import { AppEvent } from './event';
import { notazamd } from './markdown';

import './index.scss';
import { Store } from './types';

const $style = document.createElement('style');
document.head.appendChild($style);
function applyStyles(store: Store): void {
    $style.innerHTML = store.styles().join('\n');
}

async function init(): Promise<void> {
    const config = await loadConfig();
    const api = githubApi(config.user, config.repo, config.token);
    const files = await api.loadFiles();
    const store = makeStore(files, notazamd().render);

    const viewState$ = observable<ViewState>();
    const appEvents$ = observable<AppEvent>();

    applyStyles(store);

    mountView(document.body, viewState$, appEvents$);
    const updateCurrentPage = (url: string): void => {
        const filename = url.replace('#/', '').replace('?edit', '');
        const editing = url.endsWith('?edit');
        if (editing) {
            viewState$.next({
                type: 'edit',
                filename: filename,
                content: store.rawContent(filename),
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
    window.addEventListener('hashchange', () => {
        updateCurrentPage(window.location.hash);
    });

    appEvents$.subscribe((event) => {
        switch (event.type) {
            case 'queryChange':
                viewState$.next({
                    type: 'search',
                    query: event.query,
                    results: store.search(event.query.toLowerCase().trim()),
                });
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

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').then(registration => {
        console.log('SW registered: ', registration);
      }).catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
    });
  }
