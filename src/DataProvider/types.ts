import { Card, Page, Style } from '../model';

export interface DataProvider {
    pages: () => Page[];
    page: (filename: string) => Page | undefined;
    related: (page: Page) => Card[];
    search: (query: string) => Card[];
    styles: () => Style[];
    update: (filename: string, content: string) => DataProvider;
}
