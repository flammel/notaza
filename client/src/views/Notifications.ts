import { Notification } from '../types';
import * as Bacon from 'baconjs';

interface Notifications {
    element: HTMLElement;
}

export function makeNotifications(notifications$: Bacon.Observable<Notification>): Notifications {
    const $notifications = document.createElement('div');
    $notifications.classList.add('notifications');

    notifications$.onValue((notification) => {
        const $notification = document.createElement('div');
        $notification.classList.add('notification');
        $notification.innerText = notification.message;
        $notification.classList.add(notification.type === 'error' ? 'notification--error' : 'notification--success');
        $notifications.appendChild($notification);
        setTimeout(() => {
            $notifications.removeChild($notification);
        }, 3000);
    });

    return {
        element: $notifications,
    };
}
