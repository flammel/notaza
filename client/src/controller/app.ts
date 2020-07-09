import { SidebarController } from './sidebar';
import { PageController } from './page';
import { NotificationsController } from './notifications';
import { Dispatch } from '../framework';
import { BlockRenderer } from '../BlockRenderer';

export class AppController {
    private readonly sidebar: SidebarController;
    private readonly page: PageController;
    private readonly notifications: NotificationsController;

    public constructor(dispatch: Dispatch, blockRenderer: BlockRenderer) {
        this.sidebar = new SidebarController(dispatch);
        this.page = new PageController(dispatch, blockRenderer);
        this.notifications = new NotificationsController();
    }

    public getSidebarController(): SidebarController {
        return this.sidebar;
    }

    public getPageController(): PageController {
        return this.page;
    }

    public getNotificationsController(): NotificationsController {
        return this.notifications;
    }
}
