export class NotificationsView {
    public readonly $element: HTMLDivElement;

    constructor() {
        this.$element = document.createElement('div');
        this.$element.classList.add('notifications');
    }

    public notify(message: string, type: 'error' | 'success'): void {
        const $notification = document.createElement('div');
        $notification.classList.add('notification', 'notification--' + type);
        $notification.innerText = message;
        this.$element.appendChild($notification);
        setTimeout(() => {
            $notification.remove();
        }, 3000);
    }
}
