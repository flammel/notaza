import { Observable } from 'rxjs';
import { Notification } from '../types';

export interface NotificationsViewState {
    notifications: Notification[];
}

interface NotificationsView {
    element: HTMLElement;
}
export function makeNotificationsView(state$: Observable<NotificationsViewState>): NotificationsView {
    const $notifications = document.createElement('div');
    $notifications.classList.add('notifications');

    state$.subscribe((state) => {
        console.log('new notifications state', state);
        $notifications.innerHTML = '';
        for (const notification of state.notifications) {
            const $notification = document.createElement('div');
            $notification.classList.add('notification');
            $notification.innerText = notification.message;
            $notification.classList.add(
                notification.type === 'error' ? 'notification--error' : 'notification--success',
            );
            $notifications.appendChild($notification);
        }
    });

    return {
        element: $notifications,
    };
}
