import { VNode } from 'snabbdom/build/package/vnode';
import { h } from 'snabbdom/build/package/h';

import { AppState } from '../model';
import { NotificationsController } from '../controller/notifications';

export function notificationsView(state: AppState, controller: NotificationsController): VNode {
    return h(
        'div.notifications',
        controller.getNotifications(state).map((notification) =>
            h(
                'div.notification',
                {
                    class: {
                        'notification--error': notification.type === 'error',
                        'notification--success': notification.type === 'success',
                    },
                },
                notification.content,
            ),
        ),
    );
}
