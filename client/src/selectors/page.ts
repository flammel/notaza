import { notUndefined } from '../util';
import { Page, Block, AppState } from '../store/state';

interface ActivePage {
    page: Page;
    backlinks: PageWithBacklinks[];
}

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

export function getActivePage(state: AppState): ActivePage | undefined {
    const found = state.pages.find((page) => page.id === state.activePage);
    if (found !== undefined) {
        return {
            page: found,
            backlinks: state.pages.map((page) => pageBacklinks(page, found)).filter(notUndefined),
        };
    }
    return undefined;
}
