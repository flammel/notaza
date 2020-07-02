export type PageId = string;
export type BlockId = string;

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

export interface AppState {
    pages: Page[];
    activePage: PageId | undefined;
    editing: BlockId | undefined;
    search: string;
}

export const initialState: AppState = {
    pages: [],
    activePage: undefined,
    editing: undefined,
    search: '',
};
