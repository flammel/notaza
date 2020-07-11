import { VNode } from 'snabbdom/build/package/vnode';
import { h } from 'snabbdom/build/package/h';

import { AppState } from '../store/state';
import { sidebarView } from './sidebar';
import { pageView } from './page';
import { notificationsView } from './notifications';
import { BlockRenderer } from '../BlockRenderer';
import { Dispatch } from '../store/store';

export function appView(state: AppState, dispatch: Dispatch, blockRenderer: BlockRenderer): VNode {
    return h('div.app', [
        sidebarView(state, dispatch),
        pageView(state, dispatch, blockRenderer),
        notificationsView(state),
    ]);
}
