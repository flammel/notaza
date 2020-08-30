import { VNode } from 'snabbdom/build/package/vnode';
import { h } from 'snabbdom/build/package/h';

import { AppState } from '../store/state';
import { sidebarView } from './sidebar';
import { pageView } from './page';
import { notificationsView } from './notifications';
import { BlockRenderer } from '../service/BlockRenderer';
import { Dispatch } from '../store/store';
import { Editor } from './editor';

export function appView(state: AppState, dispatch: Dispatch, blockRenderer: BlockRenderer, editor: Editor): VNode {
    return h('div.app', [
        sidebarView(state, dispatch),
        ...state.openPages.map((pageId) => pageView(state, dispatch, blockRenderer, editor, pageId)),
        notificationsView(state),
    ]);
}
