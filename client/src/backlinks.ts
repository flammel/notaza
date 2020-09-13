import { Page } from './Page';
import { MarkdownRenderer } from './MarkdownRenderer';

function containsReference(str: string, page: Page): boolean {
    return (
        str.toLocaleLowerCase().includes('](./' + page.filename.toLocaleLowerCase() + ')') ||
        str.toLocaleLowerCase().includes('](./' + page.filename.toLocaleLowerCase().slice(0, -3) + ')') ||
        str.toLocaleLowerCase().includes('#' + page.filename.toLocaleLowerCase().slice(0, -3)) ||
        str.toLocaleLowerCase().includes('[[' + page.title.toLocaleLowerCase() + ']]')
    );
}

interface Backlink {
    content: string;
}

interface PageWithBacklinks {
    page: Page;
    backlinks: Backlink[];
}

export function getBacklinks(markdownRenderer: MarkdownRenderer, pages: Page[], activePage: Page): PageWithBacklinks[] {
    return pages
        .map((otherPage) => {
            if (otherPage.filename === activePage.filename || !containsReference(otherPage.body, activePage)) {
                return { page: otherPage, backlinks: [] };
            } else {
                return {
                    page: otherPage,
                    backlinks: markdownRenderer
                        .parse(otherPage)
                        .filter((token) => token.type === 'inline' && containsReference(token.content, activePage))
                        .map((token) => ({ content: token.content })),
                };
            }
        })
        .filter(({ backlinks }) => backlinks.length > 0);
}
