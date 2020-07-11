import { AppState } from '../model';
import { SidebarView } from './sidebar';
import { PageView } from './page';
import { NotificationsView } from './notifications';
import { MessageBus } from '../framework';
import { BlockRenderer } from '../BlockRenderer';

export class AppView {
    private readonly sidebar: SidebarView;
    private readonly page: PageView;
    private readonly notifications: NotificationsView;

    public constructor($parent: HTMLElement, mbus: MessageBus, blockRenderer: BlockRenderer) {
        const $root = document.createElement('div');
        $root.classList.add('app');
        $parent.appendChild($root);

        this.sidebar = new SidebarView($root, mbus);
        this.page = new PageView($root, mbus, blockRenderer);
        this.notifications = new NotificationsView($root);
    }

    public update(state: AppState): void {
        this.sidebar.update(state);
        this.page.update(state);
        this.notifications.update(state);
    }
}
