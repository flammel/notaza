import { notUndefined } from '../util';
import { Page, Block, AppState } from '../model';
import { Editor } from '../views/editor';
import { BlockRenderer } from '../BlockRenderer';
import { Dispatch } from '../framework';
import * as messages from '../messages/messages';

interface PageWithBacklinks {
    page: Page;
    backlinks: Block[];
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

function pageBacklinks(page: Page, activePage: Page): PageWithBacklinks | undefined {
    if (page.id !== activePage.id) {
        const backlinks: Block[] = page.children.map((block) => blockBacklinks(block, activePage)).filter(notUndefined);
        if (backlinks.length > 0) {
            return {
                page,
                backlinks,
            };
        }
    }
}

export class PageController {
    public constructor(private readonly dispatch: Dispatch, private readonly blockRenderer: BlockRenderer) {}
    public setPageTitle(title: string): void {
        this.dispatch(messages.setPageTitle({ title }));
    }

    public getActivePage(state: AppState): Page | undefined {
        if (state.activePage === undefined) {
            return undefined;
        }
        return state.pages.find((page) => page.id === state.activePage);
    }

    public getBacklinks(state: AppState): PageWithBacklinks[] {
        const activePage = this.getActivePage(state);
        if (activePage !== undefined) {
            return state.pages.map((page) => pageBacklinks(page, activePage)).filter(notUndefined);
        } else {
            return [];
        }
    }

    public isEditing(state: AppState, block: Block): boolean {
        return state.editing === block.id;
    }

    public render(block: Block): string {
        return this.blockRenderer.render(block);
    }

    public toggleDone(block: Block): void {
        this.dispatch(messages.toggleDone({ blockId: block.id }));
    }

    public startEditing(block: Block): void {
        this.dispatch(messages.startEditing({ blockId: block.id }));
    }

    public getEditor(state: AppState, block: Block): Editor {
        return new Editor(block, state.pages, this.dispatch);
    }
}
