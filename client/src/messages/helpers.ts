import { PageId, AppState, BlockId, Block, Page } from '../model';

export function urlToId(url: string): PageId {
    if (url.startsWith('/')) {
        return url.substring(1);
    } else if (url.startsWith('./')) {
        return url.substring(2);
    } else {
        return url;
    }
}

export function modifyBlockInActivePage(state: AppState, blockId: BlockId, fn: (oldBlock: Block) => Block): AppState {
    return modifyActivePage(state, (page) => ({
        ...page,
        children: page.children.map((child) => modifyBlock(child, blockId, fn)),
    }));
}

export function modifyActivePage(state: AppState, fn: (page: Page) => Page): AppState {
    return {
        ...state,
        pages: state.pages.map((page) => (page.id === state.activePage ? fn(page) : page)),
    };
}

export function setContent(state: AppState, content: string): AppState {
    const editing = state.editing;
    if (editing) {
        return modifyBlockInActivePage(state, editing, (oldBlock) => ({ ...oldBlock, content }));
    } else {
        return state;
    }
}

function modifyBlock(block: Block, blockId: BlockId, fn: (oldBlock: Block) => Block): Block {
    if (block.id === blockId) {
        return fn(block);
    } else {
        return { ...block, children: block.children.map((child) => modifyBlock(child, blockId, fn)) };
    }
}

export function removeBlock<T extends Block | Page>(block: T, blockId: BlockId): T {
    return {
        ...block,
        children: block.children.filter((child) => child.id !== blockId).map((child) => removeBlock(child, blockId)),
    };
}

export function splitBlock<T extends Block | Page>(block: T, blockId: BlockId, before: string, newBlock: Block): T {
    return {
        ...block,
        children: block.children.flatMap((child) => {
            if (child.id === blockId) {
                if (child.children.length > 0) {
                    return [
                        {
                            ...child,
                            content: before,
                            children: [newBlock, ...child.children],
                        },
                    ];
                } else {
                    return [{ ...child, content: before }, newBlock];
                }
            } else {
                return [splitBlock(child, blockId, before, newBlock)];
            }
        }),
    };
}

export function indentBlock<T extends Block | Page>(block: T, blockId: BlockId, content: string): T {
    const newChildren: Block[] = [];
    let prev: Block | undefined = undefined;
    for (const child of block.children) {
        if (prev === undefined) {
            prev = child;
            continue;
        }
        if (child.id === blockId) {
            newChildren.push({
                ...prev,
                children: [...prev.children, { ...child, content }],
            });
            prev = undefined;
        } else {
            newChildren.push(indentBlock(prev, blockId, content));
            prev = child;
        }
    }
    if (prev !== undefined) {
        newChildren.push(indentBlock(prev, blockId, content));
    }
    return {
        ...block,
        children: newChildren,
    };
}

export function unindentBlock<T extends Block | Page>(block: T, blockId: BlockId, content: string): T {
    const newChildren: Block[] = [];
    for (const child of block.children) {
        const [newSubs, found] = child.children.reduce<[Block[], Block | undefined]>(
            ([filtered, found], sub) => (sub.id === blockId ? [filtered, sub] : [[...filtered, sub], found]),
            [[], undefined],
        );
        if (found === undefined) {
            newChildren.push(unindentBlock(child, blockId, content));
        } else {
            newChildren.push({
                ...child,
                children: newSubs,
            });
            newChildren.push({ ...found, content });
        }
    }
    return {
        ...block,
        children: newChildren,
    };
}
