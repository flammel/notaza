import { Page, PageId } from './Page';
import { dateToString } from './util';
import { Api } from './Api';
import { Subject } from 'rxjs';

export class PageRepository {
    public readonly pagesLoaded$ = new Subject<null>();
    public readonly notifications$ = new Subject<{ message: string; type: 'error' | 'success' }>();
    private readonly api: Api;
    private pages: Map<PageId, Page> | undefined;

    constructor(api: Api) {
        this.api = api;
    }

    public setPages(pages: Page[]): void {
        this.pages = new Map(pages.map((page) => [page.id, page]));
        this.pagesLoaded$.next(null);
    }

    public getAllPages(): Page[] {
        return this.pages === undefined ? [] : [...this.pages.values()];
    }

    public getPage(id: PageId): Page {
        if (id === '') {
            id = dateToString(new Date());
        }
        const page = this.pages?.get(id);
        if (page instanceof Page) {
            return page;
        } else {
            return new Page({
                id: id,
                title: id,
                children: [{ content: '', children: [] }],
            });
        }
    }

    public save(page: Page): void {
        this.api
            .savePage(page)
            .then(() => this.notifications$.next({ message: 'page saved', type: 'success' }))
            .catch(() => this.notifications$.next({ message: 'save failed', type: 'error' }));
    }
}
