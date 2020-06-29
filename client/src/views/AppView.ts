import _ from 'lodash';
import { SidebarView } from './SidebarView';
import { NotificationsView } from './NotificationsView';
import { PageView } from './PageView';
import { PageWithBacklinks, PageId } from '../Page';
import { BlockRenderer } from '../BlockRenderer';
import { PageRepository } from '../PageRepository';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

// function getBacklinks(block: Block, target: PageId): Block[] {
//     const result = _.flatten(block.children.map((child) => getBacklinks(child, target)));
//     if (block.getContent().includes('](./' + target + '.md)') || block.getContent().includes('#' + target)) {
//         result.push(block);
//     }
//     return result;
// }

// function computeBacklinks(pages: Iterable<Page>, activePage: Page): BacklinkPage[] {
//     const pagesWithLinks = [];
//     for (const page of pages) {
//         if (page.id !== activePage.id) {
//             const backlinks = [];
//             for (const child of page.children) {
//                 backlinks.push(
//                     ...getBacklinks(child, activePage.id).map((block) => ({
//                         content: block.getContent(),
//                     })),
//                 );
//             }
//             if (backlinks.length > 0) {
//                 pagesWithLinks.push({
//                     title: page.getTitle(),
//                     id: page.id,
//                     backlinks,
//                 });
//             }
//         }
//     }
//     return pagesWithLinks;
// }

export class AppView {
    public readonly $element: HTMLElement;

    constructor(renderer: BlockRenderer, pageRepository: PageRepository, activePageId$: Observable<PageId>) {
        const sidebarView = new SidebarView(pageRepository);
        const notificationsView = new NotificationsView();

        this.$element = document.createElement('div');
        this.$element.classList.add('app');
        this.$element.appendChild(sidebarView.$element);
        this.$element.appendChild(notificationsView.$element);
        pageRepository.notifications$.subscribe(({ message, type }) => notificationsView.notify(message, type));

        let pageView: PageView | undefined;
        let pageChangeSubscription: Subscription | undefined;
        combineLatest([activePageId$, pageRepository.pagesLoaded$]).subscribe(([id, loaded]) => {
            if (loaded) {
                const page = pageRepository.getPage(id);
                if (pageChangeSubscription !== undefined) {
                    pageChangeSubscription.unsubscribe();
                }
                pageChangeSubscription = page.changed$.pipe(debounceTime(100)).subscribe((change) => {
                    pageRepository.save(page);
                });
                const view = new PageView(renderer, new PageWithBacklinks(page));
                if (pageView === undefined) {
                    this.$element.appendChild(view.$root);
                } else {
                    pageView.$root.replaceWith(view.$root);
                }
                pageView = view;
            }
        });
    }
}
