import { map, scan } from 'rxjs/operators';
import { init } from 'snabbdom/build/package/init';
import { VNode } from 'snabbdom/build/package/vnode';
import { attributesModule } from 'snabbdom/build/package/modules/attributes';
import { propsModule } from 'snabbdom/build/package/modules/props';
import { eventListenersModule } from 'snabbdom/build/package/modules/eventlisteners';
import { classModule } from 'snabbdom/build/package/modules/class';

import * as framework from './framework';
import * as messages from './messages/messages';
import * as handlers from './messages/handlers';
import { on } from './framework';
import { Api } from './Api';
import { PageParser } from './PageParser';
import { BlockRenderer } from './BlockRenderer';
import { PageSerializer } from './PageSerializer';
import { AppState, initialState, Block } from './model';
import { appView } from './views/app';
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
    on(messages.inbox, (state, { block }) => handlers.inbox(api, state, block)),
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

const view$ = app.state$.pipe(map((state) => appView(state, app.dispatch, blockRenderer)));

const patch = init([attributesModule, propsModule, eventListenersModule, classModule]);
view$
    .pipe(
        scan(
            (acc: HTMLElement | VNode, value) => patch(acc, value),
            document.getElementById('container') as HTMLElement,
        ),
    )
    .subscribe();

function hasOwnProperty<X extends {}, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
    return obj.hasOwnProperty(prop);
}

function parseInboxBlock(input: unknown): Block | undefined {
    if (input instanceof Object) {
        if (hasOwnProperty(input, 'content') && typeof input.content === 'string') {
            const children = [];
            if (hasOwnProperty(input, 'children') && Array.isArray(input.children)) {
                for (const child of input.children) {
                    const parsed = parseInboxBlock(child);
                    if (parsed === undefined) {
                        return undefined;
                    } else {
                        children.push(parsed);
                    }
                }
            }
            return {
                id: makeId(),
                content: input.content,
                children,
            };
        }
    }
}

api.loadPages().then((pages) => {
    app.dispatch(messages.pagesLoaded({ pages }));
    app.dispatch(messages.setUrl({ url: window.location.pathname }));
    if (window.location.hash.startsWith('#inbox:')) {
        const decoded = JSON.parse(atob(window.location.hash.substring('#inbox:'.length)));
        const parsed = parseInboxBlock(decoded);
        if (parsed !== undefined) {
            app.dispatch(messages.inbox({ block: parsed }));
            window.location.hash = '';
        }
    }
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
