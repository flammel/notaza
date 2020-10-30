import { Page } from './Page';
import { MarkdownRenderer } from './MarkdownRenderer';
import Token from 'markdown-it/lib/token';

interface Backlink {
    content: Token[];
}

interface PageWithBacklinks {
    page: Page;
    backlinks: Backlink[];
}

function containsReference(str: string, page: Page): boolean {
    return (
        str.toLocaleLowerCase().includes('](./' + page.filename.toLocaleLowerCase() + ')') ||
        str.toLocaleLowerCase().includes('](./' + page.filename.toLocaleLowerCase().slice(0, -3) + ')') ||
        str.toLocaleLowerCase().includes('#' + page.filename.toLocaleLowerCase().slice(0, -3)) ||
        str.toLocaleLowerCase().includes('[[' + page.title.toLocaleLowerCase() + ']]')
    );
}

function untilClose(startIndex: number, tokens: Token[]): [number, Token[]] {
    let level = 0;
    for (let index = startIndex + 1; index < tokens.length; index++) {
        const token = tokens[index];
        if (token.type === 'list_item_open') {
            level++;
        } else if (token.type === 'list_item_close') {
            if (level === 0) {
                return [index, tokens.slice(startIndex, index + 1)];
            } else {
                level--;
            }
        }
    }
    return [startIndex, []];
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
                const [newIndex, tokensUntilClose] = untilClose(listItemIndices[listItemIndices.length - 2], tokens);
                index = newIndex;
                backlinks.push({
                    content: wrapInList(tokensUntilClose),
                });
            } else {
                backlinks.push({ content: [token] });
            }
        }
    }

    return backlinks;
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
