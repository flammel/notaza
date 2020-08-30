import { Page, AbsoluteBlockId, Block, Notification, PageId } from './state';

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
    pageId: PageId;
    title: string;
}
export interface ToggleDone {
    type: 'ToggleDoneAction';
    blockId: AbsoluteBlockId;
}
export interface StartEditing {
    type: 'StartEditingAction';
    blockId: AbsoluteBlockId;
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
export interface UploadFileStart {
    type: 'UploadFileStartAction';
    file: File;
}
export interface UploadFileFinish {
    type: 'UploadFileFinishAction';
    filename: string;
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
    | Inbox
    | UploadFileStart
    | UploadFileFinish;

export const actions = {
    upload: (file: File): UploadFileStart => ({ type: 'UploadFileStartAction', file }),
    uploadFinished: (filename: string): UploadFileFinish => ({ type: 'UploadFileFinishAction', filename }),
};
