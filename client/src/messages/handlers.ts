import { AppState, Page, BlockId } from '../model';
import { makeId, dateToString } from '../util';
import * as helpers from './helpers';
import * as messages from './messages';
import { Effects, effects, Message } from '../framework';
import { Api } from '../Api';

export function setSearch(state: AppState, search: string): AppState {
    return { ...state, search };
}

export function setUrl(state: AppState, url: string): AppState {
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
    return { ...state, pages: newPages, activePage: pageId, editing: undefined };
}

export function setPages(state: AppState, pages: Page[]): AppState {
    return { ...state, pages };
}

export function setEditing(state: AppState, blockId: BlockId): AppState {
    return {
        ...state,
        editing: state.editing === undefined ? blockId : state.editing,
    };
}

function saveEffect(api: Api, state: AppState): Effects<AppState> {
    const page = state.pages.find((page) => page.id === state.activePage);
    return effects({
        state,
        ...(page === undefined
            ? {}
            : {
                  run: {
                      fn: (): Promise<unknown> => api.savePage(page),
                      cb: (suc): Message | undefined =>
                          suc === null ? messages.pageSaved({}) : messages.pageSaveFailed({}),
                  },
              }),
    });
}

export function setPageTitle(api: Api, state: AppState, title: string): Effects<AppState> {
    return saveEffect(api, {
        ...state,
        pages: state.pages.map((page) => (page.id === state.activePage ? { ...page, title } : page)),
    });
}

export function toggleDone(api: Api, state: AppState, blockId: BlockId): Effects<AppState> {
    return saveEffect(
        api,
        helpers.modifyBlockInActivePage(state, blockId, (oldBlock) => {
            if (oldBlock.content.startsWith('[] ')) {
                return { ...oldBlock, content: '[x] ' + oldBlock.content.substring(3) };
            }
            if (oldBlock.content.startsWith('[x] ')) {
                return { ...oldBlock, content: '[] ' + oldBlock.content.substring(4) };
            }
            return oldBlock;
        }),
    );
}

export function startEditing(state: AppState, blockId: BlockId): AppState {
    return { ...state, editing: blockId };
}

export function stopEditing(api: Api, state: AppState, content: string): Effects<AppState> {
    return saveEffect(api, {
        ...state,
        ...helpers.setContent(state, content),
        editing: undefined,
    });
}

export function removeBlock(api: Api, state: AppState): AppState | Effects<AppState> {
    const editing = state.editing;
    if (editing) {
        return saveEffect(api, {
            ...state,
            ...helpers.modifyActivePage(state, (page) => helpers.removeBlock(page, editing)),
            editing: undefined,
        });
    } else {
        return state;
    }
}

export function splitBlock(api: Api, state: AppState, before: string, after: string): AppState | Effects<AppState> {
    const editing = state.editing;
    if (editing) {
        const newBlock = { id: makeId(), content: after, children: [] };
        return saveEffect(api, {
            ...state,
            ...helpers.modifyActivePage(state, (page) => helpers.splitBlock(page, editing, before, newBlock)),
            editing: newBlock.id,
        });
    } else {
        return state;
    }
}

export function indentBlock(api: Api, state: AppState, content: string): AppState | Effects<AppState> {
    const editing = state.editing;
    if (editing) {
        return saveEffect(api, {
            ...state,
            ...helpers.modifyActivePage(state, (page) => helpers.indentBlock(page, editing, content)),
        });
    } else {
        return state;
    }
}

export function unindentBlock(api: Api, state: AppState, content: string): AppState | Effects<AppState> {
    const editing = state.editing;
    if (editing) {
        return saveEffect(api, {
            ...state,
            ...helpers.modifyActivePage(state, (page) => helpers.unindentBlock(page, editing, content)),
        });
    } else {
        return state;
    }
}