import _ from 'lodash';
import { SidebarView } from './SidebarView';
import { NotificationsView } from './NotificationsView';
import { PageView, BacklinkPage } from './PageView';
import { Page, Block, PageId } from '../Page';
import { BlockRenderer } from '../BlockRenderer';
import { PageRepository } from '../PageRepository';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

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
                    title: page.getTitle(),
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
    private readonly pageRepository: PageRepository;
    private pageChangeSubscription: Subscription | undefined;

    constructor(renderer: BlockRenderer, pageRepository: PageRepository, activePageId$: Observable<PageId>) {
        this.sidebarView = new SidebarView(pageRepository);
        this.notificationsView = new NotificationsView();
        this.pageView = new PageView(renderer);
        this.pageRepository = pageRepository;
        this.$element = document.createElement('div');
        this.$element.classList.add('app');
        this.$element.appendChild(this.sidebarView.$element);
        this.$element.appendChild(this.notificationsView.$element);
        this.$element.appendChild(this.pageView.$element);
        this.pageRepository.notifications$.subscribe(({ message, type }) =>
            this.notificationsView.notify(message, type),
        );

        combineLatest([activePageId$, this.pageRepository.pagesLoaded$]).subscribe(([id, loaded]) => {
            if (loaded) {
                const page = this.pageRepository.getPage(id);
                if (this.pageChangeSubscription !== undefined) {
                    this.pageChangeSubscription.unsubscribe();
                }
                this.pageChangeSubscription = page.changed$.pipe(debounceTime(100)).subscribe((change) => {
                    console.log(change);
                    this.pageRepository.save(page);
                });
                this.pageView.setPage(page, computeBacklinks(this.pageRepository.getAllPages(), page));
            }
        });
    }
}
