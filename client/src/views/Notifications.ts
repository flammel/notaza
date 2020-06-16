import { Notification, AppStore, AppState } from '../types';

function selectNotifications(state: AppState): Notification[] {
    return state.notifications;
}

export class NotificationsView extends HTMLDivElement {
    constructor(store: AppStore) {
        super();

        this.classList.add('notifications');

        store.select(selectNotifications).subscribe((notifications) => {
            console.log('new notifications', notifications);
            this.innerHTML = '';
            for (const notification of notifications) {
                const $notification = document.createElement('div');
                $notification.classList.add('notification');
                $notification.innerText = notification.message;
                $notification.classList.add(
                    notification.type === 'error' ? 'notification--error' : 'notification--success',
                );
                this.appendChild($notification);
            }
        });
    }
}
customElements.define('n-notifications', NotificationsView, { extends: 'div' });
