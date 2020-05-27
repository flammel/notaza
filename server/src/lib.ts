import unified from 'unified';
import builder from 'unist-builder';
import visitWithParents from 'unist-util-visit-parents';
import { Node } from 'unist';
import remarkStringify from 'remark-stringify';
import markdown from 'remark-parse';
import vfile from 'vfile';

export type PageId = string;
export type PageTitle = string;
export interface FrontMatter {
    title: string;
}
export interface Page {
    id: PageId;
    frontMatter: FrontMatter;
    raw: string;
    markdown: string;
    rawBacklinks: string;
}

type RawPage = string;
type RawFrontMatter = string;
type RawMarkdown = string;
type RawBacklinks = string;
type LinkNode = Node & { url: string };
type LinkWithContext = Node;
interface ParsedPage extends Page {
    root: Node;
}

const startCommentValue = '\n<!-- notaza backlinks start -->\n';
const endCommentValue = '\n<!-- notaza backlinks end -->\n';
const parsingProcessor = unified().use(markdown);
const stringifyProcessor = unified().use(remarkStringify, { bullet: '*' });

function replaceBacklinks(pages: Map<PageId, Page>, markdown: string, links: Map<PageId, Node[]>): string {
    const beforeStart = markdown.split(startCommentValue, 2).shift() || '';
    const endParts = markdown.split(endCommentValue, 2);
    const afterEnd = endParts.length === 1 ? '' : endParts.pop() || '';
    const newBacklinks = stringifyProcessor.stringify(backlinksNode(pages, links));
    return (beforeStart.trimRight() + '\n\n' + newBacklinks + '\n\n' + afterEnd.trimLeft()).trimRight() + '\n';
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

function backlinksNode(pages: Map<PageId, Page>, backlinks: Map<PageId, LinkWithContext[]>): Node {
    const u = builder;
    const listItems: Node[] = [...backlinks.entries()].map(([origin, contexts]) => {
        const linkText = pages.get(origin)?.frontMatter.title || origin;
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

function setLinkTitles(pages: Map<PageId, Page>, markdown: string): string {
    return markdown.replace(/\[\]\(\.\/([a-zA-Z0-9-_]+)(\.md)?\)/g, (match: string, content: string): string => {
        const title = pages.get(content)?.frontMatter.title || content;
        return `[${title}](./${content}.md)`;
    });
}

function parsePage(page: Page): ParsedPage {
    return {
        ...page,
        root: parsingProcessor.parse(vfile(page.markdown)),
    };
}

function parseFrontMatter(id: PageId, raw: RawFrontMatter): FrontMatter {
    for (const line of raw.split('\n')) {
        if (line.indexOf('title: ') === 0) {
            return {
                title: line.substring('title: '.length),
            };
        }
    }
    return {
        title: id,
    };
}

function splitRaw(raw: RawPage): [RawFrontMatter, RawMarkdown, RawBacklinks] {
    const frontMatterParts = raw.split('\n---\n');
    const rawFrontMatter = frontMatterParts.shift() || '';
    const afterFrontMatter = frontMatterParts.join('\n---\n');
    const backlinkStartParts = afterFrontMatter.split(startCommentValue);
    const beforeBacklinkStart = backlinkStartParts.shift() || '';
    const afterBacklinkStart = backlinkStartParts.join(startCommentValue);
    const backlinkEndParts = afterBacklinkStart.split(endCommentValue);
    const rawBacklinks = backlinkEndParts.shift() || '';
    const afterBacklinkEnd = backlinkEndParts.join(endCommentValue);
    return [rawFrontMatter, beforeBacklinkStart + afterBacklinkEnd, rawBacklinks];
}

export function readPage(id: PageId, raw: RawPage): Page {
    raw = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const [rawFrontMatter, markdown, rawBacklinks] = splitRaw(raw);
    return {
        id,
        raw,
        frontMatter: parseFrontMatter(id, rawFrontMatter),
        markdown,
        rawBacklinks,
    };
}

export function updateBacklinks(pages: Map<PageId, Page>, page: Page): Page {
    const links = new Map<PageId, Node[]>();

    for (const item of pages.values()) {
        if (item.id !== page.id) {
            const linksInItem = getInternalLinksTo(parsePage(page).root, page);
            if (linksInItem.length > 0) {
                links.set(item.id, linksInItem);
            }
        }
    }

    return readPage(page.id, setLinkTitles(pages, replaceBacklinks(pages, page.raw, links)));
}
