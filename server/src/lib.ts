import unified from 'unified';
import builder from 'unist-builder';
import visitWithParents from 'unist-util-visit-parents';
import { Node } from 'unist';
import remarkStringify from 'remark-stringify';
import markdown from 'remark-parse';
import vfile from 'vfile';

type LinkNode = Node & { url: string };
type FileName = string;
type OriginFileName = FileName;
type LinkWithContext = Node;
export type PageId = string;
type PageTitle = string;
export interface Page {
    id: PageId;
    markdown: string;
}
export interface ParsedPage extends Page {
    title: PageTitle;
    root: Node;
}

const startCommentValue = '<!-- notaza backlinks start -->';
const endCommentValue = '<!-- notaza backlinks end -->';
const parsingProcessor = unified().use(markdown);
const stringifyProcessor = unified().use(remarkStringify, { bullet: '*' });

function replaceBacklinks(pages: Map<PageId, ParsedPage>, markdown: string, links: Map<PageId, Node[]>): string {
    const beforeStart = markdown.split(startCommentValue, 2).shift() || '';
    const endParts = markdown.split(endCommentValue, 2);
    const afterEnd = endParts.length === 1 ? '' : endParts.pop() || '';
    const newBacklinks = stringifyProcessor.stringify(backlinksNode(pages, links));
    return (beforeStart + newBacklinks + afterEnd).trimRight() + '\n';
}

function getInternalLinksTo(tree: Node, page: Page): Node[] {
    const links: Node[] = [];
    visitWithParents(tree, 'link', (node: LinkNode, ancestors: Node[]) => {
        if (node.url === './' + page.id + '.md') {
            const containingListItem = ancestors[2];
            if (containingListItem && containingListItem.type === 'listItem') {
                links.push(containingListItem);
            } else {
                links.push(builder('listItem', { spread: false }, [node]));
            }
        }
    });
    return links;
}

function withoutFrontmatterAndBacklinks(markdown: string): string {
    const beforeBacklinks = markdown.split(startCommentValue, 2).shift();
    const afterBacklinks = markdown.split(endCommentValue, 2).pop();
    const afterFrontmatter = beforeBacklinks?.split('\n---\n', 2).pop();
    return (afterFrontmatter || '') + (afterBacklinks || '');
}

function backlinksNode(pages: Map<PageId, ParsedPage>, backlinks: Map<OriginFileName, LinkWithContext[]>): Node {
    const u = builder;
    const listItems: Node[] = [...backlinks.entries()].map(([origin, contexts]) => {
        const linkText = pages.get(origin)?.title || origin;
        return u('listItem', { spread: false }, [
            u('link', { url: './' + origin + '.md' }, [u('text', linkText)]),
            u('list', { ordered: false, spread: false }, contexts),
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

function getTitle(page: Page): PageTitle {
    const match = page.markdown.match(/\ntitle: (.*)\n/gm);
    return match?.shift()?.substring('title: '.length).trim() || page.id;
}

export function parsePage(page: Page): ParsedPage {
    const parsed = parsingProcessor.parse(vfile(withoutFrontmatterAndBacklinks(page.markdown)));
    return {
        ...page,
        root: parsed,
        title: getTitle(page),
    };
}

export function updateBacklinks(pages: Map<PageId, ParsedPage>, page: Page): Page {
    const links = new Map<PageId, Node[]>();

    for (const item of pages.values()) {
        if (item.id !== page.id) {
            const linksInItem = getInternalLinksTo(item.root, page);
            if (linksInItem.length > 0) {
                links.set(item.id, linksInItem);
            }
        }
    }

    return { ...page, markdown: replaceBacklinks(pages, page.markdown, links) };
}
