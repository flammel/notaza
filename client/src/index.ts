import { init } from 'snabbdom/build/package/init';
import { VNode } from 'snabbdom/build/package/vnode';
import { attributesModule } from 'snabbdom/build/package/modules/attributes';
import { propsModule } from 'snabbdom/build/package/modules/props';
import { eventListenersModule } from 'snabbdom/build/package/modules/eventlisteners';
import { classModule } from 'snabbdom/build/package/modules/class';

import { Api } from './service/Api';
import { PageParser } from './service/PageParser';
import { BlockRenderer } from './service/BlockRenderer';
import { PageSerializer } from './service/PageSerializer';
import { initialState, Block } from './store/state';
import { appView } from './views/app';
import { makeId, hasOwnProperty } from './util';
import { createStore } from './store/store';
import { actionHandler } from './store/actionHandler';
import { createEffectHandler } from './store/effectHandler';

import './index.scss';
import { Editor } from './views/editor';

const pageParser = new PageParser();
const pageSerializer = new PageSerializer();
const blockRenderer = new BlockRenderer();
const api = new Api(window.localStorage.getItem('apiUri') ?? '', pageParser, pageSerializer);

const store = createStore(actionHandler, createEffectHandler(api), initialState);
const editor = new Editor(store.dispatch);

let oldVNode: HTMLElement | VNode = document.getElementById('container') as HTMLElement;
const patch = init([attributesModule, propsModule, eventListenersModule, classModule]);
store.subscribe((state) => (oldVNode = patch(oldVNode, appView(state, store.dispatch, blockRenderer, editor))));

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
    store.dispatch({ type: 'PagesLoadedAction', pages });
    store.dispatch({ type: 'SetUrlAction', url: window.location.pathname });
    if (window.location.hash.startsWith('#inbox:')) {
        const decoded = JSON.parse(atob(window.location.hash.substring('#inbox:'.length)));
        const parsed = parseInboxBlock(decoded);
        if (parsed !== undefined) {
            store.dispatch({ type: 'InboxAction', block: parsed });
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
                store.dispatch({ type: 'SetUrlAction', url: href });
            }
        }
    }
});

window.addEventListener('popstate', () => {
    store.dispatch({ type: 'SetUrlAction', url: window.location.pathname });
});

// PWA

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/serviceWorker.js').then();
    });
}
