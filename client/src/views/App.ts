import { Page, Block, PageId } from '../types';
import { SidebarView } from './Sidebar';
import { NotificationsView } from './Notifications';
import { PageView } from './Page';

export class AppView {
    private readonly sidebar: SidebarView;
    private readonly notifications: NotificationsView;
    private readonly page: PageView;

    public constructor(
        $container: HTMLElement,
        renderBlock: (block: Block) => string,
        savePage: (id: PageId, rawMarkdown: string) => void,
    ) {
        const $app = document.createElement('div');
        $app.classList.add('app');

        this.sidebar = new SidebarView($app);
        this.notifications = new NotificationsView($app);
        this.page = new PageView($app, renderBlock, savePage);

        $container.appendChild($app);
    }

    public setPages(pages: Page[]): void {
        this.sidebar.setPages(pages);
        this.page.setPages(pages);
    }

    public setUrl(url: string): void {
        this.page.setUrl(url);
    }
}
