import { Action, Block, Page, BlockContainer } from './types';
import { State, BlockPath, Pages } from './types';
import { dateToString } from './util';
import * as _ from 'lodash';

export function onQueryChange(newQuery: string): Action {
    return (state): State => {
        state.sidebar.query = newQuery;
        return state;
    };
}

export function onBlockClick(blockPath: BlockPath): Action {
    return (state): State => {
        state.editing = { blockPath };
        return state;
    };
}

export function onCheckboxClick(blockPath: BlockPath): Action {
    return (state): State => {
        const page = activePage(state);
        if (page) {
            const block = getBlock(page, blockPath);
            if (block) {
                if (block.content.startsWith('[] ')) {
                    block.content = '[x] ' + block.content.substring(3);
                } else if (block.content.startsWith('[x] ')) {
                    block.content = '[] ' + block.content.substring(4);
                }
            }
        }
        return state;
    };
}

export function onEditorInput(blockPath: BlockPath, content: string): Action {
    return (state): State => {
        setContent(state, blockPath, content);
        return state;
    };
}

export function onPagesLoaded(pages: Pages): Action {
    return (state): State => {
        state.pages = pages;
        return state;
    };
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

export function onUrlChange(newUrl: string): Action {
    return (state): State => {
        const newId = urlToId(newUrl);
        state.activePageId = newId;
        const page = activePage(state);
        if (!page) {
            state.pages.push({
                id: newId,
                created: new Date().toISOString(),
                title: newId,
                children: [{ content: '', children: [] }],
            });
        }
        state.editing = undefined;
        return state;
    };
}

export function splitBlock(path: BlockPath, contentBefore: string, contentAfter: string): Action {
    return (state): State => {
        const page = activePage(state);
        if (!page) {
            return state;
        }
        const block = getBlock(page, path);
        if (block) {
            block.content = contentBefore;
            const newBlock = { content: contentAfter, children: [] };
            if (block.children.length === 0) {
                const newPath = [...path.slice(0, -1), path[path.length - 1] + 1];
                insertBlock(page, newPath, newBlock);
                state.editing = { blockPath: newPath };
            } else {
                const newPath = [...path, 0];
                insertBlock(page, newPath, newBlock);
                state.editing = { blockPath: newPath };
            }
        }
        return state;
    };
}

function activePage(state: State): Page | undefined {
    return state.pages.find((page) => page.id === state.activePageId);
}

function getBlock(parent: BlockContainer, path: BlockPath): Block | undefined {
    const head = _.head(path);
    if (head !== undefined) {
        const newParent = parent.children[head];
        if (newParent !== undefined) {
            const tail = _.tail(path);
            return tail.length === 0 ? newParent : getBlock(newParent, tail);
        }
    }
}

function removeBlock(parent: BlockContainer, path: BlockPath): Block | undefined {
    if (path.length === 1) {
        const removed = parent.children.splice(path[0], 1);
        return removed[0];
    } else {
        return removeBlock(parent.children[path[0]], _.tail(path));
    }
}

function insertBlock(parent: BlockContainer, path: BlockPath, block: Block): void {
    if (path.length === 1) {
        if (path[0] === -1) {
            parent.children.push(block);
        } else {
            parent.children.splice(path[0], 0, block);
        }
    } else {
        insertBlock(parent.children[path[0]], _.tail(path), block);
    }
}

function setContent(state: State, path: BlockPath, content: string): void {
    const page = activePage(state);
    if (page) {
        const block = getBlock(page, path);
        if (block) {
            block.content = content;
        }
    }
}

export function stopEditing(path: BlockPath, content: string): Action {
    return (state): State => {
        setContent(state, path, content);
        state.editing = undefined;
        return state;
    };
}

function moveBlock(page: Page, from: BlockPath, to: BlockPath): Block | undefined {
    const block = removeBlock(page, from);
    if (block) {
        insertBlock(page, to, block);
        return block;
    }
}

export function increaseLevel(path: BlockPath, content: string): Action {
    return (state): State => {
        const last = _.last(path);
        if (last === undefined || last === 0) {
            return state;
        }
        const page = activePage(state);
        if (page) {
            const parentPath = [...path.slice(0, -1), last - 1];
            const parent = getBlock(page, parentPath);
            const to = [...path.slice(0, -1), last - 1, parent?.children.length || 0];
            const block = moveBlock(page, path, to);
            if (block) {
                block.content = content;
                state.editing = { blockPath: to };
            }
        }
        return state;
    };
}

export function decreaseLevel(path: BlockPath, content: string): Action {
    return (state): State => {
        if (path.length < 2) {
            return state;
        }
        const page = activePage(state);
        if (page) {
            const to = [...path.slice(0, -2), path[path.length - 2] + 1];
            const block = moveBlock(page, path, to);
            if (block) {
                block.content = content;
                state.editing = { blockPath: to };
            }
        }
        return state;
    };
}

export function mergeWithPrevious(path: BlockPath, content: string): Action {
    return (state): State => {
        setContent(state, path, content);
        return state;
    };
}

export function mergeWithNext(path: BlockPath, content: string): Action {
    return (state): State => {
        setContent(state, path, content);
        return state;
    };
}

export function startEditingPrevious(path: BlockPath, content: string): Action {
    return (state): State => {
        setContent(state, path, content);
        const index = path.pop();
        if (index === 0) {
            state.editing = { blockPath: path };
        } else if (index !== undefined) {
            state.editing = { blockPath: [...path, index - 1] };
        }
        return state;
    };
}

export function startEditingNext(path: BlockPath, content: string): Action {
    return (state): State => {
        setContent(state, path, content);
        return state;
    };
}

export function deleteBlock(path: BlockPath): Action {
    return (state): State => {
        const page = activePage(state);
        if (page) {
            removeBlock(page, path);
            state.editing = undefined;
        }
        return state;
    };
}
