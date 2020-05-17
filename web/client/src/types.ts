export interface Page {
    id: PageId;
    url: string;
    title: string;
    block: Block;
}
export interface Block {
    id: BlockId;
    content: string;
    children: Blocks;
}
export type Blocks = Block[];
export type Pages = Page[];
export type BlockId = string;
export type PageId = string;
export interface Notification {
    type: 'success' | 'error';
    id: string;
    message: string;
}

export interface WritableAppState {
    pages: Pages;
    currentPage: PageId;
    editingId: BlockId | undefined;
    notifications: Notification[];
}
export type AppState = Readonly<WritableAppState>;

export type Dispatch<StateType, ActionType> = (action: Dispatchable<StateType, ActionType>) => void
export type Thunk<StateType, ActionType> = (dispatch: Dispatch<StateType, ActionType>, getState: () => StateType) => void;
export type Dispatchable<StateType, ActionType> = ActionType | Thunk<StateType, ActionType>
export interface Store<StateType, ActionType> {
    dispatch: Dispatch<StateType, ActionType>;
    subscribe: (listener: (state: StateType) => void) => void;
}
