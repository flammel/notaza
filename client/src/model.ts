export type PageId = string;
export type BlockId = string;
export type NotificationId = string;

export interface Block {
    id: BlockId;
    content: string;
    children: Block[];
}

export interface Page {
    id: PageId;
    title: string;
    children: Block[];
}

export interface Notification {
    id: NotificationId;
    content: string;
    type: 'error' | 'success';
}

export interface AppState {
    pages: Page[];
    activePage: PageId | undefined;
    editing: BlockId | undefined;
    editorContent: string;
    search: string;
    notifications: Notification[];
}

export const initialState: AppState = {
    pages: [],
    activePage: undefined,
    editing: undefined,
    editorContent: '',
    search: '',
    notifications: [],
};
