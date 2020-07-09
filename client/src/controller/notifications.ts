import { AppState, Notification } from '../model';

export class NotificationsController {
    public getNotifications(state: AppState): Notification[] {
        return state.notifications;
    }
}
