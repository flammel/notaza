import { Page, PageId } from './Page';
import { dateToString } from './util';
import { Api } from './Api';

export class PageRepository {
    private readonly api: Api;
    private pages: Map<PageId, Page> | undefined;
    private readonly listeners: (() => unknown)[] = [];

    constructor(api: Api) {
        this.api = api;
    }

    public setPages(pages: Page[]): void {
        this.pages = new Map(pages.map((page) => [page.id, page]));
        for (const listener of this.listeners) {
            listener();
        }
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

    public addPagesListener(listener: () => unknown): void {
        this.listeners.push(listener);
    }

    public save(page: Page): void {
        this.api.savePage(page);
    }
}
