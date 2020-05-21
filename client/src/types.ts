export interface Page {
    id: PageId;
    title: string;
    markdown: string;
}
export type Pages = Page[];
export type PageId = string;
export interface Notification {
    type: 'success' | 'error';
    message: string;
}
