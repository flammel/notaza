import { produce } from 'immer';
import { Page, Block, Pages, PageId, Notification, BlockId, AppState, WritableAppState, Thunk } from './types';
import { makeBlockId } from './blockId';
import { useApi } from './Api';

interface BlockWithParent {
    page: Page;
    parent: Block;
    block: Block;
    predecessor: Block | undefined;
    index: number;
}
function findBlockRecursive(page: Page, parent: Block, blockId: BlockId): BlockWithParent | undefined {
    let predecessor: Block | undefined;
    for (let index = 0; index < parent.children.length; index++) {
        const block = parent.children[index];
        if (block.id === blockId) {
            return {
                page,
                parent,
                block,
                predecessor,
                index
            };
        }
        const found = findBlockRecursive(page, block, blockId);
        if (found) {
            return found;
        }
        predecessor = block;
    }
    return undefined;
}
function findBlock(pages: Pages, pageId: PageId, blockId: BlockId): BlockWithParent | undefined {
    for (const page of pages) {
        if (page.id === pageId) {
            return findBlockRecursive(page, page.block, blockId);
        }
    }
}

function reduceWithBlock(state: AppState, action: BlockAction, fn: (found: BlockWithParent, draft: WritableAppState) => void): AppState {
    return produce(state, draft => {
        const found = findBlock(draft.pages, action.pageId, action.blockId);
        if (!found) {
            return state;
        }
        fn(found, draft);
    })
}

interface OpenPageAction {
    type: 'OpenPageAction';
    url: string;
}
interface SetPagesAction {
    type: 'SetPagesAction';
    pages: Pages;
}
interface BlockAction {
    type: string;
    pageId: PageId;
    blockId: BlockId;
    newContent: string;
}
interface ChangeBlockLevelAction extends BlockAction {
    type: 'ChangeBlockLevelAction';
    change: number;
}
interface MergeBlockWithSuccessorAction extends BlockAction {
    type: 'MergeBlockWithSuccessorAction';
}
interface MergeBlockWithPredecessorAction extends BlockAction {
    type: 'MergeBlockWithPredecessorAction';
}
interface SplitBlockAction extends BlockAction {
    type: 'SplitBlockAction';
    after: string;
}
interface StartEditingAction {
    type: 'StartEditingAction';
    blockId: BlockId;
}
interface StopEditingAction extends BlockAction {
    type: 'StopEditingAction';
}
interface AddNotificationAction {
    type: 'AddNotificationAction';
    notification: Notification;
}
interface RemoveNotificationAction {
    type: 'RemoveNotificationAction';
    id: string;
}
export type AppAction =
    | OpenPageAction
    | SetPagesAction
    | ChangeBlockLevelAction
    | MergeBlockWithSuccessorAction
    | MergeBlockWithPredecessorAction
    | SplitBlockAction
    | StartEditingAction
    | StopEditingAction
    | AddNotificationAction
    | RemoveNotificationAction

function exhaustiveCheck( param: never ) { }

export function reduce(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case 'SplitBlockAction':
            return reduceWithBlock(state, action, ({parent, block, index}, draft) => {
                const newBlock = {
                    id: makeBlockId(),
                    content: action.after,
                    children: [],
                };
                block.content = action.newContent;
                if (block.children.length > 0) {
                    block.children.unshift(newBlock);
                } else {
                    parent.children.splice(index + 1, 0, newBlock);
                }
                draft.editingId = newBlock.id;
            });
        case 'MergeBlockWithPredecessorAction':
            return reduceWithBlock(state, action, ({page, parent, block, index, predecessor}, draft) => {
                if (!predecessor && parent !== page.block) {
                    parent.content = parent.content + action.newContent;
                    parent.children.splice(index, 1);
                    draft.editingId = parent.id;
                } else if (predecessor && predecessor.children.length === 0) {
                    predecessor.content = predecessor.content + action.newContent;
                    predecessor.children = block.children;
                    parent.children.splice(index, 1);
                    draft.editingId = predecessor.id;
                }
            });
        case 'MergeBlockWithSuccessorAction':
            return reduceWithBlock(state, action, ({parent, block, index}, draft) => {
            });
        case 'ChangeBlockLevelAction':
            return reduceWithBlock(state, action, ({parent, block, index, predecessor}, draft) => {
                if (predecessor && action.change === 1) {
                    block.content = action.newContent;
                    parent.children.splice(index, 1);
                    predecessor.children.push(block);
                } else if (!predecessor && action.change === -1) {
                    const parentContext = findBlock(draft.pages, action.pageId, parent.id);
                    if (parentContext) {
                        block.content = action.newContent;
                        parent.children.splice(index, 1);
                        parentContext.parent.children.splice(parentContext.index + 1, 0, block);
                    }
                }
            });
        case 'StartEditingAction':
            return produce(state, draft => {
                draft.editingId = action.blockId
            });
        case 'StopEditingAction':
            return reduceWithBlock(state, action, ({block}, draft) => {
                block.content = action.newContent;
                draft.editingId = undefined;
            });
        case 'AddNotificationAction':
            return produce(state, draft => {
                draft.notifications.push(action.notification);
            });
        case 'RemoveNotificationAction':
            return produce(state, draft => {
                draft.notifications = draft.notifications.filter((notification) => notification.id !== action.id);
            });
        case 'SetPagesAction':
            return produce(state, (draft) => {
                draft.pages = action.pages;
            });
        case 'OpenPageAction':
            return produce(state, (draft) => {
                for (const page of draft.pages) {
                    if (page.url === action.url) {
                        draft.currentPage = page.id;
                    }
                }
            });
        default:
            exhaustiveCheck(action);
            return state;
    }
}

export function savePage(pageId: PageId): Thunk<AppState, AppAction> {
    return (dispatch, getState) => {
        for (const page of getState().pages) {
            if (page.id === pageId) {
                useApi()
                    .savePage(page)
                    .then(() => {
                        dispatch(
                            addNotification({
                                id: makeBlockId(),
                                type: 'success',
                                message: 'saved',
                            }),
                        );
                    });
            }
        }
    }
}

export function setPages(pages: Pages): AppAction {
    return {type: 'SetPagesAction', pages};
}

export function splitBlock(pageId: PageId, blockId: BlockId, newContent: string, after: string): AppAction {
    return {type: 'SplitBlockAction', pageId, blockId, newContent, after};
}

export function mergeBlockWithPredecessor(pageId: PageId, blockId: BlockId, newContent: string): AppAction {
    return {type: 'MergeBlockWithPredecessorAction', pageId, blockId, newContent};
}

export function mergeBlockWithSuccessor(pageId: PageId, blockId: BlockId, newContent: string): AppAction {
    return {type: 'MergeBlockWithSuccessorAction', pageId, blockId, newContent};
}

export function changeBlockLevel(pageId: PageId, blockId: BlockId, change: number, newContent: string): AppAction {
    return {type: 'ChangeBlockLevelAction', pageId, blockId, change, newContent};
}

export function changeUrl(url: string): AppAction {
    window.history.pushState(undefined, '', url);
    return {type: 'OpenPageAction', url};
}

export function startEditing(blockId: BlockId): AppAction {
    return {type: 'StartEditingAction', blockId};
}

export function stopEditing(pageId: PageId, blockId: BlockId, newContent: string): AppAction {
    return {type: 'StopEditingAction', pageId, blockId, newContent};
}

export function removeNotification(id: string): AppAction {
    return {type: 'RemoveNotificationAction', id};
}

export function addNotification(notification: Notification): AppAction {
    return {type: 'AddNotificationAction', notification};
}
