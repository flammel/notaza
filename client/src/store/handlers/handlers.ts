import { AppState, Page, BlockId, Notification, Block } from '../state';
import { makeId, dateToString } from '../../util';
import * as helpers from './helpers';
import { Effects } from '../store';
import { SavePageEffect } from '../effect';

export function setSearch(state: AppState, search: string): Effects {
    return [{ ...state, search }];
}

export function setPages(state: AppState, pages: Page[]): Effects {
    return [{ ...state, pages }];
}

export function setEditing(state: AppState, blockId: BlockId): Effects {
    return [
        {
            ...state,
            editing: state.editing === undefined ? blockId : state.editing,
        },
    ];
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
        { ...state, pages: newPages, activePage: pageId, editing: undefined },
        {
            type: 'DocumentTitleEffect',
            title: (found ? found.title : pageId) + ' | Notaza',
        },
    ];
}

export function setPageTitle(state: AppState, title: string): Effects {
    return [
        {
            ...state,
            pages: state.pages.map((page) => (page.id === state.activePage ? { ...page, title } : page)),
        },
    ];
}

export function toggleDone(state: AppState, blockId: BlockId): Effects {
    return [
        helpers.modifyBlockInActivePage(state, blockId, (oldBlock) => {
            if (oldBlock.content.startsWith('[] ')) {
                return { ...oldBlock, content: '[x] ' + oldBlock.content.substring(3) };
            }
            if (oldBlock.content.startsWith('[x] ')) {
                return { ...oldBlock, content: '[] ' + oldBlock.content.substring(4) };
            }
            return oldBlock;
        }),
    ];
}

export function startEditing(state: AppState, blockId: BlockId): Effects {
    return [{ ...state, editing: blockId }];
}

export function stopEditing(state: AppState, content: string): Effects {
    return [
        {
            ...state,
            ...helpers.setContent(state, content),
            editing: undefined,
        },
    ];
}

export function removeBlock(state: AppState): Effects {
    const editing = state.editing;
    if (editing) {
        return [
            {
                ...state,
                ...helpers.modifyActivePage(state, (page) => helpers.removeBlock(page, editing)),
                editing: undefined,
            },
        ];
    } else {
        return [state];
    }
}

export function splitBlock(state: AppState, before: string, after: string): Effects {
    const editing = state.editing;
    if (editing) {
        const newContent = (before.startsWith('[] ') || before.startsWith('[x] ')) && after === '' ? '[] ' : after;
        const newBlock = { id: makeId(), content: newContent, children: [] };
        return [
            {
                ...state,
                ...helpers.modifyActivePage(state, (page) => helpers.splitBlock(page, editing, before, newBlock)),
                editing: newBlock.id,
            },
        ];
    } else {
        return [state];
    }
}

function saveEffect(page: Page | undefined): [] | [SavePageEffect] {
    return page === undefined ? [] : [{ type: 'SavePageEffect', page }];
}

function moveBlock(
    state: AppState,
    content: string,
    mover: (page: Page, editing: string, content: string) => Page,
): Effects {
    const editing = state.editing;
    if (editing) {
        const newState = {
            ...state,
            ...helpers.modifyActivePage(state, (page) => mover(page, editing, content)),
        };
        const page = newState.pages.find((page) => page.id === state.activePage);
        return [newState, ...saveEffect(page)];
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

export function inbox(state: AppState, block: Block): Effects {
    return [
        {
            ...state,
            ...helpers.modifyActivePage(state, (page) => ({ ...page, children: [block, ...page.children] })),
        },
    ];
}
