import unified from 'unified';
import builder from 'unist-builder';
import visitWithParents from 'unist-util-visit-parents';
import { Node } from 'unist';
import remarkStringify from 'remark-stringify';
import markdown from 'remark-parse';
import vfile from 'vfile';
import { Page, PageId } from './types';
import { getPages, savePage } from './storage';

const startCommentValue = '<!-- notaza backlinks start -->';
const endCommentValue = '<!-- notaza backlinks end -->';
const parsingProcessor = unified().use(markdown);
const stringifyProcessor = unified().use(remarkStringify, { bullet: '*' });

function getTitle(page: Page): string {
    const match = page.markdown.match(/\ntitle: (.*)\n/gm);
    return match?.shift()?.substring('title: '.length).trim() || page.id;
}

function backlinksNode(links: [Page, Node][]): Node {
    const u = builder;
    const listItems: Node[] = links.map(([page, link]) => {
        return u('listItem', { spread: false }, [
            u('link', { url: './' + page.id + '.md' }, [u('text', getTitle(page))]),
            u('list', { ordered: false, spread: false }, [link]),
        ]);
    });
    return {
        type: 'root',
        children: [
            u('html', { value: startCommentValue }),
            u('heading', { depth: 2 }, [u('text', 'Backlinks')]),
            u('list', { ordered: false, spread: false }, listItems),
            u('html', { value: endCommentValue }),
        ],
    };
}

function onlyContent(page: Page): string {
    return page.markdown.slice(page.markdown.indexOf('\n---\n') + 5, page.markdown.indexOf(startCommentValue));
}

function getLinksIn(page: Page): [PageId, Node][] {
    const parsed = parsingProcessor.parse(vfile(onlyContent(page)));
    const links: [PageId, Node][] = [];
    visitWithParents(parsed, 'link', (node: Node, ancestors: Node[]) => {
        if (typeof node.url === 'string' && node.url.startsWith('./') && node.url.endsWith('.md')) {
            const pageId = node.url.slice(2, -3);
            const containingListItem = ancestors[2];
            if (containingListItem && containingListItem.type === 'listItem') {
                links.push([pageId, containingListItem]);
            } else {
                links.push([pageId, builder('listItem', { spread: false }, [node])]);
            }
        }
    });
    return links;
}

function replaceBacklinks(page: Page, links: [Page, Node][]): Page {
    const newBacklinks = stringifyProcessor.stringify(backlinksNode(links));
    const startIndex = page.markdown.indexOf(startCommentValue);
    const endIndex = page.markdown.lastIndexOf(endCommentValue);
    const beforeStart = page.markdown.slice(0, startIndex).trimRight();
    const afterEnd = page.markdown.slice(endIndex + endCommentValue.length).trimLeft();
    const newMarkdown = beforeStart + '\n\n' + newBacklinks + '\n\n' + afterEnd;
    return { ...page, markdown: newMarkdown };
}

export async function update(updated: Page): Promise<Page[]> {
    const pages = await getPages();
    const linksByTarget = new Map<PageId, [Page, Node][]>();

    for (const page of pages) {
        const linksInPage = getLinksIn(page);
        for (const [target, node] of linksInPage) {
            if (linksByTarget.has(target)) {
                linksByTarget.get(target)?.push([page, node]);
            } else {
                linksByTarget.set(target, [[page, node]]);
            }
        }
    }

    for (const page of pages) {
        const links = linksByTarget.get(page.id);
        if (links) {
            await savePage(replaceBacklinks(page, links));
        }
    }

    return await getPages();
}
