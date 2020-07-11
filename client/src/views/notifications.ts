import { AppState } from '../model';

export class NotificationsView {
    private readonly $root: HTMLDivElement;

    public constructor($parent: HTMLElement) {
        this.$root = document.createElement('div');
        this.$root.classList.add('notifications');

        $parent.appendChild(this.$root);
    }

    public update(state: AppState): void {
        this.$root.innerHTML = state.notifications
            .map(
                (notification) =>
                    `<div class="notification notification--${notification.type}">${notification.content}</div>`,
            )
            .join('');
    }
}
