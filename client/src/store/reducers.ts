import { produce } from 'immer';
import * as actions from './actions';
import { on, Reducer } from './store';
import { AppState, Page, BlockPath, Block, PageId, Pages } from '../types';
import { dateToString } from '../util';

function getBlock(page: Page, path: BlockPath): Block | undefined {
    let blocks = page.blocks;
    for (const index of path) {
        if (index === path.length - 1) {
            return blocks[index];
        } else {
            blocks = blocks[index].children;
        }
    }
    return undefined;
}

function getPage(pages: Pages, id: PageId | undefined): Page | undefined {
    if (id !== undefined) {
        for (const page of pages) {
            if (page.id === id) {
                return page;
            }
        }
    }
    return undefined;
}

function urlToId(url: string): string {
    if (url.startsWith('/')) {
        url = url.substring(1);
    }
    if (url.startsWith('./')) {
        url = url.substring(2);
    }
    if (url === '') {
        return dateToString(new Date());
    }
    return url;
}

export const reducers: Reducer<AppState>[] = [
    on(actions.setPages, (state, action) => {
        return { ...state, pages: action.pages };
    }),
    on(actions.setUrl, (state, action) => {
        return { ...state, activePageId: urlToId(action.url), editing: undefined };
    }),
    on(actions.setEditedContent, (state, action) => {
        return { ...state, editedContent: action.content };
    }),
    on(actions.stopEditing, (state) => {
        return produce(state, (draft) => {
            if (draft.editing && draft.activePageId) {
                // const page = getPage(draft.pages, draft.activePageId);
                // if (page) {
                //     const block = getBlock(page, draft.editing.blockPath);
                //     if (block) {
                //         block.content = draft.editing.content;
                //     }
                // }
                draft.editing = undefined;
            }
        });
    }),
    on(actions.startEditing, (state, action) => {
        const page = getPage(state.pages, state.activePageId);
        if (!page) {
            return state;
        }
        return {
            ...state,
            editing: {
                blockPath: action.blockPath,
            },
        };
    }),
    on(actions.updateQuery, (state, action) => {
        return { ...state, sidebar: { query: action.query } };
    }),
];
