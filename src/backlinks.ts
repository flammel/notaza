import { Page } from './Page';
import { MarkdownRenderer } from './MarkdownRenderer';
import Token from 'markdown-it/lib/token';

function containsReference(str: string, page: Page): boolean {
    return (
        str.toLocaleLowerCase().includes('](./' + page.filename.toLocaleLowerCase() + ')') ||
        str.toLocaleLowerCase().includes('](./' + page.filename.toLocaleLowerCase().slice(0, -3) + ')') ||
        str.toLocaleLowerCase().includes('#' + page.filename.toLocaleLowerCase().slice(0, -3)) ||
        str.toLocaleLowerCase().includes('[[' + page.title.toLocaleLowerCase() + ']]')
    );
}

interface Backlink {
    content: Token[];
}

function containsListItem(startIndex: number, tokens: Token[]): boolean {
    for (let index = startIndex; index < tokens.length; index++) {
        const token = tokens[index];
        if (token.type === 'list_item_open') {
            return true;
        } else if (token.type === 'list_item_close') {
            return false;
        }
    }
    return false;
}

function untilClose(startIndex: number, tokens: Token[]): Token[] {
    let level = 0;
    for (let index = startIndex + 1; index < tokens.length; index++) {
        const token = tokens[index];
        if (token.type === 'list_item_open') {
            level++;
        } else if (token.type === 'list_item_close') {
            if (level === 0) {
                return tokens.slice(startIndex, index + 1);
            } else {
                level--;
            }
        }
    }
    return [];
}

function wrapInList(tokens: Token[]): Token[] {
    return [new Token('bullet_list_open', 'ul', 1), ...tokens, new Token('bullet_list_close', 'ul', 1)];
}

function extractBacklinks(tokens: Token[], activePage: Page): Backlink[] {
    const backlinks: Backlink[] = [];

    const listItemIndices: number[] = [];
    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        if (token.type === 'list_item_open') {
            listItemIndices.push(index);
        } else if (token.type === 'list_item_close') {
            listItemIndices.pop();
        } else if (token.type === 'inline' && containsReference(token.content, activePage)) {
            if (listItemIndices.length >= 2) {
                backlinks.push({
                    content: wrapInList(untilClose(listItemIndices[listItemIndices.length - 2], tokens)),
                });
            } else {
                backlinks.push({ content: [token] });
            }
        }
    }

    return backlinks;
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
                    backlinks: extractBacklinks(markdownRenderer.parse(otherPage), activePage),
                };
            }
        })
        .filter(({ backlinks }) => backlinks.length > 0);
}
