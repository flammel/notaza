import { VNode } from 'snabbdom/build/package/vnode';
import { h } from 'snabbdom/build/package/h';

import { Notification } from '../model';

export function notificationsView(notifications: Notification[]): VNode {
    return h(
        'div.notifications',
        notifications.map((notification) =>
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
