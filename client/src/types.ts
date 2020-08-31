export type PageId = string;
export type BlockId = string;
export type AbsoluteBlockId = { pageId: PageId; blockId: BlockId };
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
    rawMarkdown: string;
}

export interface Notification {
    id: NotificationId;
    content: string;
    type: 'error' | 'success';
}

export interface AppState {
    pages: Page[];
    openPages: PageId[];
    editing: AbsoluteBlockId | undefined;
    search: string;
    notifications: Notification[];
}

export const initialState: AppState = {
    pages: [],
    openPages: [],
    editing: undefined,
    search: '',
    notifications: [],
};
