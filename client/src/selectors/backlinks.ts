import { createSelector } from '../framework';
import { notUndefined } from '../util';
import { Page, Block } from '../model';
import { selectActivePage } from './activePage';

interface BacklinkPage {
    page: Page;
    backlinks: Block[];
}

function blockContainsLinkTo(block: Block, activePage: Page): boolean {
    return block.content.includes('](./' + activePage.id + '.md)') || block.content.includes('#' + activePage.id);
}

function blockBacklinks(block: Block, activePage: Page): Block | undefined {
    const childrenWithBacklinks = block.children.map((child) => blockBacklinks(child, activePage)).filter(notUndefined);
    if (blockContainsLinkTo(block, activePage) || childrenWithBacklinks.length > 0) {
        return { ...block, children: childrenWithBacklinks };
    }
}

function pageBacklinks(page: Page, activePage: Page): BacklinkPage | undefined {
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

function backlinks(pages: Page[], activePage: Page): BacklinkPage[] {
    return pages.map((page) => pageBacklinks(page, activePage)).filter(notUndefined);
}

export const selectBacklinks = createSelector((state) => {
    const activePage = selectActivePage(state);
    if (activePage !== undefined) {
        return backlinks(state.pages, activePage);
    } else {
        return [];
    }
});
