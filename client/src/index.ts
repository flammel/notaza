import * as framework from './framework';
import * as messages from './messages/messages';
import * as handlers from './messages/handlers';
import { on } from './framework';
import { Api } from './Api';
import { PageParser } from './PageParser';
import { BlockRenderer } from './BlockRenderer';
import { PageSerializer } from './PageSerializer';
import { AppState, initialState } from './model';
import { AppView } from './views/app';
import './index.scss';
import { makeId } from './util';

const pageParser = new PageParser();
const pageSerializer = new PageSerializer();
const blockRenderer = new BlockRenderer();
const api = new Api(window.localStorage.getItem('apiUri') ?? '', pageParser, pageSerializer);

const app = framework.init<AppState>(initialState, [
    on(messages.setSearch, (state, { search }) => handlers.setSearch(state, search)),
    on(messages.setUrl, (state, { url }) => handlers.setUrl(state, url)),
    on(messages.pagesLoaded, (state, { pages }) => handlers.setPages(state, pages)),
    on(messages.setPageTitle, (state, { title }) => handlers.setPageTitle(api, state, title)),
    on(messages.toggleDone, (state, { blockId }) => handlers.toggleDone(api, state, blockId)),
    on(messages.startEditing, (state, { blockId }) => handlers.startEditing(state, blockId)),
    on(messages.stopEditing, (state, { content }) => handlers.stopEditing(api, state, content)),
    on(messages.removeBlock, (state) => handlers.removeBlock(api, state)),
    on(messages.splitBlock, (state, { before, after }) => handlers.splitBlock(api, state, before, after)),
    on(messages.indentBlock, (state, { content }) => handlers.indentBlock(api, state, content)),
    on(messages.unindentBlock, (state, { content }) => handlers.unindentBlock(api, state, content)),
    on(messages.moveUp, (state, { content }) => handlers.moveUp(api, state, content)),
    on(messages.moveDown, (state, { content }) => handlers.moveDown(api, state, content)),
    on(messages.removeNotification, (state, { notification }) => handlers.removeNotification(state, notification)),
    on(messages.pageSaved, (state) =>
        handlers.addNotification(state, {
            id: makeId(),
            content: 'page saved',
            type: 'success',
        }),
    ),
    on(messages.pageSaveFailed, (state) =>
        handlers.addNotification(state, {
            id: makeId(),
            content: 'page save failed',
            type: 'error',
        }),
    ),
]);

const appView = new AppView(
    document.getElementById('container') as HTMLElement,
    { dispatch: app.dispatch },
    blockRenderer,
);
app.state$.subscribe((state) => appView.update(state));

api.loadPages().then((pages) => {
    app.dispatch(messages.pagesLoaded({ pages }));
    app.dispatch(messages.setUrl({ url: window.location.pathname }));
});

document.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof HTMLElement) {
        const closestLink = target.closest('a');
        if (closestLink instanceof HTMLAnchorElement && closestLink.classList.contains('internal')) {
            event.preventDefault();
            const href = closestLink.getAttribute('href');
            if (href) {
                window.history.pushState(null, href, href);
                app.dispatch(messages.setUrl({ url: href }));
            }
        }
    }
});

window.addEventListener('popstate', () => {
    app.dispatch(messages.setUrl({ url: window.location.pathname }));
});

// PWA

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/serviceWorker.js').then();
    });
}
