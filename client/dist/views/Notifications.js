export function makeNotifications(notifications$) {
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
//# sourceMappingURL=Notifications.js.map