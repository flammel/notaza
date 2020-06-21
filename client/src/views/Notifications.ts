import { Notification } from '../types';
import { Store } from '../store';
import { WrappedElement } from '../html';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export class NotificationsController {
    constructor(private readonly store: Store) {}

    public get notifications$(): Observable<Notification[]> {
        return this.store.state$.pipe(map((state) => state.notifications));
    }
}

export class NotificationsView implements WrappedElement {
    public readonly $element: HTMLDivElement;

    constructor(controller: NotificationsController) {
        this.$element = document.createElement('div');
        this.$element.classList.add('notifications');

        controller.notifications$.subscribe((notifications) => {
            this.$element.innerHTML = '';
            for (const notification of notifications) {
                const $notification = document.createElement('div');
                $notification.classList.add('notification');
                $notification.innerText = notification.message;
                $notification.classList.add(
                    notification.type === 'error' ? 'notification--error' : 'notification--success',
                );
                this.$element.appendChild($notification);
            }
        });
    }
}
