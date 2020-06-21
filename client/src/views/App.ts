import { SidebarView, SidebarController } from './Sidebar';
import { NotificationsView, NotificationsController } from './Notifications';
import { PageView, Page, BacklinkPage } from './Page';
import { Store } from '../store';
import { WrappedElement } from '../html';
import { Pages, Page as PT, Block, PageId } from '../types';
import _ from 'lodash';

function getBacklinks(block: Block, target: PageId): Block[] {
    const result = _.flatten(block.children.map((child) => getBacklinks(child, target)));
    if (block.content.includes('](./' + target + '.md)') || block.content.includes('#' + target)) {
        result.push(block);
    }
    return result;
}

function computeBacklinks(pages: Pages, activePage: PT): BacklinkPage[] {
    const pagesWithLinks = [];
    for (const page of pages) {
        if (page.id !== activePage.id) {
            const backlinks = [];
            for (const child of page.children) {
                backlinks.push(
                    ...getBacklinks(child, activePage.id).map((block) => ({
                        content: block.content,
                    })),
                );
            }
            if (backlinks.length > 0) {
                pagesWithLinks.push({
                    title: page.title,
                    id: page.id,
                    backlinks,
                });
            }
        }
    }
    return pagesWithLinks;
}

export class AppView implements WrappedElement {
    public readonly $element: HTMLElement;

    constructor(store: Store) {
        const sidebarController = new SidebarController(store);
        const sidebarView = new SidebarView(sidebarController);

        const notificationsController = new NotificationsController(store);
        const notificationsView = new NotificationsView(notificationsController);

        const pageView = new PageView(store.renderer);
        store.state$.subscribe((state) => {
            const page = state.pages.find((page) => page.id === state.activePageId);
            if (page !== undefined) {
                pageView.setPage(new Page(page), computeBacklinks(state.pages, page));
            }
        });

        this.$element = document.createElement('div');
        this.$element.classList.add('app');
        this.$element.appendChild(sidebarView.$element);
        this.$element.appendChild(notificationsView.$element);
        this.$element.appendChild(pageView.$element);
    }
}
