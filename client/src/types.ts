export interface BlockContainer {
    children: Block[];
}
export interface Block extends BlockContainer {
    content: string;
}
export type BlockPath = number[];

export interface Page extends BlockContainer {
    id: PageId;
    title: string;
    created: string;
}
export type Pages = Page[];
export type PageId = string;

export interface Notification {
    type: 'success' | 'error';
    message: string;
}

export type Action = (state: State) => State;
export interface State {
    sidebar: {
        query: string;
    };
    notifications: Notification[];
    pages: Pages;
    activePageId?: string;
    editing?: {
        blockPath: BlockPath;
    };
}
