export interface Block {
    content: string;
    children: Block[];
}
export interface Page {
    id: PageId;
    title: string;
    created: string;
    blocks: Block[];
}
export type Pages = Page[];
export type PageId = string;
export interface Notification {
    type: 'success' | 'error';
    message: string;
}
export interface AppState {
    query: string;
    pages: Pages;
    notifications: Notification[];
    urlId: string;
    editing: BlockPath;
    editedContent: string;
}
export type BlockPath = number[];
