import { VNode } from 'snabbdom/build/package/vnode';
import { h } from 'snabbdom/build/package/h';

import { AppState } from '../model';
import { sidebarView } from './sidebar';
import { pageView } from './page';
import { notificationsView } from './notifications';
import { AppController } from '../controller/app';

export function appView(state: AppState, controller: AppController): VNode {
    return h('div.app', [
        sidebarView(state, controller.getSidebarController()),
        pageView(state, controller.getPageController()),
        notificationsView(state, controller.getNotificationsController()),
    ]);
}
