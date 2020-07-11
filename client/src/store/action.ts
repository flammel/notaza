import { Page, BlockId, Block, Notification } from './state';

export interface SetSearch {
    type: 'SetSearchAction';
    search: string;
}
export interface SetUrl {
    type: 'SetUrlAction';
    url: string;
}
export interface PagesLoaded {
    type: 'PagesLoadedAction';
    pages: Page[];
}
export interface SetPageTitle {
    type: 'SetPageTitleAction';
    title: string;
}
export interface ToggleDone {
    type: 'ToggleDoneAction';
    blockId: BlockId;
}
export interface StartEditing {
    type: 'StartEditingAction';
    blockId: BlockId;
}
export interface StopEditing {
    type: 'StopEditingAction';
    content: string;
}
export interface RemoveBlock {
    type: 'RemoveBlockAction';
}
export interface SplitBlock {
    type: 'SplitBlockAction';
    before: string;
    after: string;
}
export interface IndentBlock {
    type: 'IndentBlockAction';
    content: string;
}
export interface UnindentBlock {
    type: 'UnindentBlockAction';
    content: string;
}
export interface PageSaved {
    type: 'PageSavedAction';
}
export interface PageSaveFailed {
    type: 'PageSaveFailedAction';
}
export interface RemoveNotification {
    type: 'RemoveNotificationAction';
    notification: Notification;
}
export interface MoveUp {
    type: 'MoveUpAction';
    content: string;
}
export interface MoveDown {
    type: 'MoveDownAction';
    content: string;
}
export interface Inbox {
    type: 'InboxAction';
    block: Block;
}

export type AppAction =
    | SetSearch
    | SetUrl
    | PagesLoaded
    | SetPageTitle
    | ToggleDone
    | StartEditing
    | StopEditing
    | RemoveBlock
    | SplitBlock
    | IndentBlock
    | UnindentBlock
    | PageSaved
    | PageSaveFailed
    | RemoveNotification
    | MoveUp
    | MoveDown
    | Inbox;
