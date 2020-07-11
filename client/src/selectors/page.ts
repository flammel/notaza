import { notUndefined, mapTree, makeId } from '../util';
import { Page, Block, BlockId, AppState } from '../model';
import { BlockRenderer } from '../BlockRenderer';

export type ViewBlock = EditingBlock | RenderedBlock;

export interface EditingBlock {
    editing: true;
    block: Block;
    children: ViewBlock[];
}

export interface RenderedBlock {
    editing: false;
    html: string;
    block: Block;
    children: ViewBlock[];
}

export interface PageState {
    title: string;
    children: ViewBlock[];
    backlinks: PageWithBacklinks[];
}

interface PageWithBacklinks {
    page: Page;
    backlinks: RenderedBlock[];
}

function blockContainsLinkTo(block: Block, activePage: Page): boolean {
    return (
        block.content.includes('](./' + activePage.id + '.md)') ||
        block.content.includes('#' + activePage.id) ||
        block.content.includes('[[' + activePage.title + ']]')
    );
}

function blockBacklinks(block: Block, activePage: Page): Block | undefined {
    const direct = block.children.find(
        (child) => blockContainsLinkTo(child, activePage) && child.children.length === 0,
    );
    if (direct !== undefined || blockContainsLinkTo(block, activePage)) {
        return block;
    }
    const childrenWithBacklinks = block.children.map((child) => blockBacklinks(child, activePage)).filter(notUndefined);
    if (blockContainsLinkTo(block, activePage) || childrenWithBacklinks.length > 0) {
        return { ...block, children: childrenWithBacklinks };
    }
}

function viewBlock(block: Block, editing: BlockId | undefined, blockRenderer: BlockRenderer): ViewBlock {
    return mapTree(block, (node) => ({
        editing: node.id === editing,
        block: node,
        html: blockRenderer.render(node),
    }));
}

function renderedBlock(block: Block, blockRenderer: BlockRenderer): RenderedBlock {
    return mapTree(block, (node) => ({
        editing: false,
        block: node,
        html: blockRenderer.render(node),
    }));
}

function pageBacklinks(page: Page, activePage: Page, blockRenderer: BlockRenderer): PageWithBacklinks | undefined {
    if (page.id !== activePage.id) {
        const backlinks: RenderedBlock[] = page.children
            .map((block) => blockBacklinks(block, activePage))
            .filter(notUndefined)
            .map((block) => renderedBlock(block, blockRenderer));
        if (backlinks.length > 0) {
            return {
                page,
                backlinks,
            };
        }
    }
}

export function selectPageState(state: AppState, blockRenderer: BlockRenderer): PageState | undefined {
    const found = state.pages.find((page) => page.id === state.activePage);
    if (found !== undefined) {
        const children = found.children.map((child) => viewBlock(child, state.editing, blockRenderer));
        if (children.length < 1) {
            children.push({
                block: {
                    id: makeId(),
                    children: [],
                    content: '',
                },
                children: [],
                editing: false,
                html: '',
            });
        }
        return {
            title: found.title,
            backlinks: state.pages.map((page) => pageBacklinks(page, found, blockRenderer)).filter(notUndefined),
            children,
        };
    }
    return undefined;
}
