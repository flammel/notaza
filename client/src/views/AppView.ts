import { SidebarView } from './SidebarView';
import { NotificationsView } from './NotificationsView';
import { PageView, BacklinkPage } from './PageView';
import { Page, Block, PageId } from '../Page';
import _ from 'lodash';
import { BlockRenderer } from '../BlockRenderer';

function getBacklinks(block: Block, target: PageId): Block[] {
    const result = _.flatten(block.children.map((child) => getBacklinks(child, target)));
    if (block.getContent().includes('](./' + target + '.md)') || block.getContent().includes('#' + target)) {
        result.push(block);
    }
    return result;
}

function computeBacklinks(pages: Iterable<Page>, activePage: Page): BacklinkPage[] {
    const pagesWithLinks = [];
    for (const page of pages) {
        if (page.id !== activePage.id) {
            const backlinks = [];
            for (const child of page.children) {
                backlinks.push(
                    ...getBacklinks(child, activePage.id).map((block) => ({
                        content: block.getContent(),
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

export class AppView {
    public readonly $element: HTMLElement;
    private readonly sidebarView: SidebarView;
    private readonly pageView: PageView;
    private readonly notificationsView: NotificationsView;
    private activePageId: PageId | undefined;
    private pages: Map<PageId, Page> | undefined;

    constructor(renderer: BlockRenderer) {
        this.sidebarView = new SidebarView();
        this.notificationsView = new NotificationsView();
        this.pageView = new PageView(renderer);
        this.$element = document.createElement('div');
        this.$element.classList.add('app');
        this.$element.appendChild(this.sidebarView.$element);
        this.$element.appendChild(this.notificationsView.$element);
        this.$element.appendChild(this.pageView.$element);
    }

    public setActivePageId(id: PageId): void {
        this.activePageId = id;
        this.setActivePage();
    }

    public setPages(pages: Page[]): void {
        this.pages = new Map(pages.map((page) => [page.id, page]));
        this.sidebarView.setPages(pages);
        this.setActivePage();
    }

    private setActivePage(): void {
        if (this.activePageId !== undefined && this.pages !== undefined) {
            const page = this.pages.get(this.activePageId);
            if (page instanceof Page) {
                this.pageView.setPage(page, computeBacklinks(this.pages.values(), page));
            }
        }
    }
}
