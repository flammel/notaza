import { VNode } from 'snabbdom/build/package/vnode';
import { h } from 'snabbdom/build/package/h';

import { AppState } from '../store/state';
import { notificationsSelector } from '../selectors/selectors';

export function notificationsView(state: AppState): VNode {
    return h(
        'div.notifications',
        notificationsSelector(state).map((notification) =>
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
