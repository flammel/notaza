import { createSelector } from '../framework';
import { notUndefined } from '../util';
import { Page, Block } from '../model';
import { selectActivePage } from './activePage';

interface PageWithBacklinks {
    page: Page;
    backlinks: Block[];
}

function blockContainsLinkTo(block: Block, activePage: Page): boolean {
    return block.content.includes('](./' + activePage.id + '.md)') || block.content.includes('#' + activePage.id);
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

export const selectBacklinks = createSelector((state) => {
    const activePage = selectActivePage(state);
    if (activePage !== undefined) {
        return state.pages.map((page) => pageBacklinks(page, activePage)).filter(notUndefined);
    } else {
        return [];
    }
});
