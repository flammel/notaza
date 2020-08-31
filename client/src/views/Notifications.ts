export class NotificationsView {
    public constructor($container: HTMLElement) {
        const $notifications = document.createElement('div');
        $notifications.classList.add('notifications');

        $container.appendChild($notifications);
    }
}

// export function notificationsView(state: AppState): VNode {
//     return h(
//         'div.notifications',
//         notificationsSelector(state).map((notification) =>
//             h(
//                 'div.notification',
//                 {
//                     class: {
//                         'notification--error': notification.type === 'error',
//                         'notification--success': notification.type === 'success',
//                     },
//                 },
//                 notification.content,
//             ),
//         ),
//     );
// }
