import { VNode } from 'snabbdom/build/package/vnode';
import { h } from 'snabbdom/build/package/h';

import { AppState } from '../model';
import { Dispatch } from '../framework';
import { sidebarView } from './sidebar';
import { pageView } from './page';
import { BlockRenderer } from '../BlockRenderer';

export function appView(state: AppState, dispatch: Dispatch, blockRenderer: BlockRenderer): VNode {
    return h('div.app', [sidebarView(state, dispatch), pageView(state, dispatch, blockRenderer)]);
}
