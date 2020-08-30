import { AppState, Page, Notification, Block, PageId, AbsoluteBlockId } from '../state';
import { makeId, dateToString, absoluteBlockId } from '../../util';
import * as helpers from './helpers';
import { Effects } from '../store';

//
// helpers
//

function saveEffect(state: AppState, pageId: PageId): Effects {
    const page = state.pages.find((page) => page.id === pageId);
    return page === undefined ? [state] : [state, { type: 'SavePageEffect', page }];
}

//
// misc
//

export function setSearch(state: AppState, search: string): Effects {
    return [{ ...state, search }];
}

export function setPages(state: AppState, pages: Page[]): Effects {
    return [{ ...state, pages }];
}

export function addNotification(state: AppState, notification: Notification): Effects {
    return [
        { ...state, notifications: [...state.notifications, notification] },
        {
            type: 'DelayedDispatchEffect',
            delay: 2000,
            action: { type: 'RemoveNotificationAction', notification },
        },
    ];
}

export function addSuccessNotification(state: AppState, content: string): Effects {
    return addNotification(state, { id: makeId(), type: 'success', content });
}

export function addErrorNotification(state: AppState, content: string): Effects {
    return addNotification(state, { id: makeId(), type: 'error', content });
}

export function removeNotification(state: AppState, notification: Notification): Effects {
    return [{ ...state, notifications: state.notifications.filter((existing) => existing.id !== notification.id) }];
}

export function setUrl(state: AppState, url: string): Effects {
    const ids = [...new Set(url.split(',').map((id) => id.replace('./', '').replace('/', '')))];

    const rawPageId = helpers.urlToId(url);
    const pageId = rawPageId === '' ? dateToString(new Date()) : rawPageId;
    const found = state.pages.find((page) => page.id === pageId);
    const newPages =
        found !== undefined
            ? state.pages
            : [
                  ...state.pages,
                  {
                      id: pageId,
                      title: pageId,
                      children: [{ id: makeId(), content: '', children: [] }],
                  },
              ];
    return [
        { ...state, pages: newPages, openPages: ids, editing: undefined },
        {
            type: 'DocumentTitleEffect',
            title: (found ? found.title : pageId) + ' | Notaza',
        },
    ];
}

export function uploadFileStart(state: AppState, file: File): Effects {
    return [state, { type: 'UploadFileEffect', file }];
}

export function uploadFileFinish(state: AppState, filename: string): Effects {
    return inbox(state, { content: `![${filename}](./${filename})`, children: [], id: makeId() });
}

//
// inbox
//

export function inbox(state: AppState, block: Block): Effects {
    const pageId = state.openPages[0];
    if (pageId) {
        return saveEffect(
            helpers.modifyPage(state, pageId, (page) => ({ ...page, children: [block, ...page.children] })),
            pageId,
        );
    } else {
        return [state];
    }
}

// page editing operations

export function setPageTitle(state: AppState, pageId: PageId, title: string): Effects {
    return saveEffect(
        {
            ...state,
            pages: state.pages.map((page) => (page.id === pageId ? { ...page, title } : page)),
        },
        pageId,
    );
}

// block editing operations

export function startEditing(state: AppState, blockId: AbsoluteBlockId): Effects {
    return [{ ...state, editing: blockId }];
}

export function stopEditing(state: AppState, content: string): Effects {
    const editing = state.editing;
    if (editing) {
        return saveEffect(
            {
                ...helpers.modifyBlock(state, editing, (block) => ({ ...block, content })),
                editing: undefined,
            },
            editing.pageId,
        );
    } else {
        return [state];
    }
}

export function toggleDone(state: AppState, blockId: AbsoluteBlockId): Effects {
    return saveEffect(
        helpers.modifyBlock(state, blockId, (oldBlock) => {
            if (oldBlock.content.startsWith('[] ')) {
                return { ...oldBlock, content: '[x] ' + oldBlock.content.substring(3) };
            }
            if (oldBlock.content.startsWith('[x] ')) {
                return { ...oldBlock, content: '[] ' + oldBlock.content.substring(4) };
            }
            return oldBlock;
        }),
        blockId.pageId,
    );
}

export function removeBlock(state: AppState): Effects {
    const editing = state.editing;
    if (editing) {
        return saveEffect(
            {
                ...helpers.modifyPage(state, editing.pageId, (page) => helpers.removeBlock(page, editing.blockId)),
                editing: undefined,
            },
            editing.pageId,
        );
    } else {
        return [state];
    }
}

export function splitBlock(state: AppState, before: string, after: string): Effects {
    const editing = state.editing;
    if (editing) {
        const newContent = (before.startsWith('[] ') || before.startsWith('[x] ')) && after === '' ? '[] ' : after;
        const newBlock = { id: makeId(), content: newContent, children: [] };
        return saveEffect(
            {
                ...helpers.modifyPage(state, editing.pageId, (page) =>
                    helpers.splitBlock(page, editing.blockId, before, newBlock),
                ),
                editing: absoluteBlockId(editing.pageId, newBlock.id),
            },
            editing.pageId,
        );
    } else {
        return [state];
    }
}

//
// moving operations
//

function moveBlock(
    state: AppState,
    content: string,
    mover: (page: Page, editing: string, content: string) => Page,
): Effects {
    const editing = state.editing;
    if (editing) {
        return saveEffect(
            helpers.modifyPage(state, editing.pageId, (page) => mover(page, editing.blockId, content)),
            editing.pageId,
        );
    } else {
        return [state];
    }
}

export function indentBlock(state: AppState, content: string): Effects {
    return moveBlock(state, content, helpers.indentBlock);
}

export function unindentBlock(state: AppState, content: string): Effects {
    return moveBlock(state, content, helpers.unindentBlock);
}

export function moveUp(state: AppState, content: string): Effects {
    return moveBlock(state, content, helpers.moveUp);
}

export function moveDown(state: AppState, content: string): Effects {
    return moveBlock(state, content, helpers.moveDown);
}
