import visit from 'unist-util-visit';
import vfile from 'to-vfile';
import unified from 'unified';
import parse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import builder from 'unist-builder';
import visitWithParents from 'unist-util-visit-parents';
import customStringify from './util';
import {Node, Parent} from 'unist';
import {Plugin} from 'unified'
import remarkStringify from 'remark-stringify'

type LinkNode = Node & {url: string};
type FileName = string;
type PageTitle = string;
type TargetFileName = FileName;
type OriginFileName = FileName;
type LinkWithContext = Node;
const pages = new Map<FileName, PageTitle>();
const links = new Map<TargetFileName, Map<OriginFileName, LinkWithContext[]>>();
const startCommentValue = '<!-- notaza backlinks start -->';
const endCommentValue = '<!-- notaza backlinks end -->';
interface FrontMatter {
    title: string;
    created: string;
}

function getFrontmatterNode(tree: Parent): Node|undefined {
    for (const child of tree.children) {
        if (child.type === 'yaml') {
            return child;
        }
    }
    return undefined;
}

function getFrontmatter(tree: Parent): FrontMatter|undefined {
    const node = getFrontmatterNode(tree);
    if (typeof node?.value === 'string') {
        const parsed = yaml.parse(node.value);
        if (parsed.title && parsed.created) {
            return parsed;
        }
    }
    return undefined;
}

function treeWithoutBacklinks(tree: Parent) {
    const newChildren = [];
    let inBacklinks = false;
    for (const child of tree.children) {
        if (child.type === 'html' && child.value === startCommentValue) {
            inBacklinks = true;
        } else if (child.type === 'html' && child.value === endCommentValue) {
            inBacklinks = false;
        } else if (!inBacklinks) {
            newChildren.push(child);
        }
    }
    return {...tree, children: newChildren};
}

function getContainingListItem(ancestors: Node[]): Node|undefined {
    for (let idx = ancestors.length - 1; idx >= 0; idx--) {
        if (ancestors[idx].type === 'listItem') {
            return ancestors[idx];
        }
    }
    return undefined;
}

function getBacklinkContext(linkNode: Parent, ancestors: Node[]): Node {
    const u = builder;
    const containingListItem = ancestors[2];
    if (containingListItem && containingListItem.type === 'listItem') {
        return containingListItem;
    } else {
        return u('listItem', {spread: false}, [
            linkNode
        ]);
    }
}

function backlinkNodes(backlinks: Map<OriginFileName, LinkWithContext[]>) {
    const u = builder;
    const listItems: Node[] = [...backlinks.entries()].map(([origin, contexts]) => {
        const linkText = pages.get(origin) || origin;
        return u('listItem', {spread: false}, [
            u('link', {url: './' + origin}, [u('text', linkText)]),
            u('list', {ordered: false, spread: false}, contexts)
        ]);
    });
    return [
        u('html', {value: startCommentValue}),
        u('heading', {depth: 2}, [u('text', 'Backlinks')]),
        u('list', {ordered: false, spread: false}, listItems),
        u('html', {value: endCommentValue})
    ];
}

function isParent(node: Node): node is Parent  {
    return Array.isArray(node.children);
}

const extractInternalLinks: Plugin = () => {
    return (tree, file) => {
        const fileName = file.basename;
        if (isParent(tree) && fileName) {
            visitWithParents(treeWithoutBacklinks(tree), 'link', (node: LinkNode, ancestors: Node[]) => {
                if (node.url.indexOf('./') === 0 && isParent(node)) {
                    const targetFileName = node.url.substring(2);
                    const existing = links.get(targetFileName);
                    const context = getBacklinkContext(node, ancestors);
                    if (existing instanceof Map) {
                        const existing2 = existing.get(fileName);
                        if (existing2 instanceof Map) {
                            existing2.push(context);
                        } else {
                            existing.set(fileName, [context]);
                        }
                    } else {
                        links.set(targetFileName, new Map<string, Node[]>([[fileName, [context]]]));
                    }
                }
            })
        }
    }
}

const extractTitles: Plugin = () => {
    return (tree, file) => {
        if (isParent(tree) && file.basename) {
            const frontmatter = getFrontmatter(tree);
            if (frontmatter) {
                pages.set(file.basename, frontmatter.title);
            }
        }
    }
}

const updateInternalLinkTitles: Plugin = () => {
    return (tree) => {
        visit(tree, 'link', (node: LinkNode) => {
            if (node.url.indexOf('./') === 0) {
                const targetFileName = node.url.substring(2);
                const title = pages.get(targetFileName) || targetFileName;
                node.children = [{
                    type: 'text',
                    value: title
                }]
            }
        })
    }
}

const addBacklinks: Plugin = () => {
    return (tree, file) => {
        if (isParent(tree) && file.basename) {
            tree.children = [...treeWithoutBacklinks(tree).children, ...backlinkNodes(links.get(file.basename) || new Map())];
        }
    }
}

function processFileExtract(filePath: string) {
    unified()
    .use(parse)
    .use(remarkStringify)
    .use(customStringify)
    .use(remarkFrontmatter, ['yaml'])
    .use(extractTitles)
    .use(extractInternalLinks)
    .process(vfile.readSync(filePath));
}

function processFileWrite(filePath: string) {
    unified()
    .use(parse)
    .use(remarkStringify)
    .use(customStringify)
    .use(remarkFrontmatter, ['yaml'])
    .use(addBacklinks)
    .use(updateInternalLinkTitles)
    .use([
        require('remark-lint'),
        [require('remark-lint-unordered-list-marker-style'), '*']
    ])
    .process(vfile.readSync(filePath), (err, file) => {
        if (file.path) {
            // console.log(String(file));
            fs.promises.writeFile(file.path, String(file));
        } else {
            console.error('No file path', file);
        }
    });
}

async function processDir(dirPath: string) {
    const dirEntries = await fs.promises.readdir(dirPath);
    for await (const dirEntry of dirEntries) {
        const entryPath = path.join(dirPath, dirEntry);
        const stat = await fs.promises.stat(entryPath);
        if (stat.isFile()) {
            processFileExtract(entryPath);
        }
    }
    for await (const dirEntry of dirEntries) {
        const entryPath = path.join(dirPath, dirEntry);
        const stat = await fs.promises.stat(entryPath);
        if (stat.isFile()) {
            processFileWrite(entryPath);
        }
    }
}

processDir(process.argv[2]);
