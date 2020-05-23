"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBacklinks = exports.parsePage = void 0;
const unified_1 = __importDefault(require("unified"));
const unist_builder_1 = __importDefault(require("unist-builder"));
const unist_util_visit_parents_1 = __importDefault(require("unist-util-visit-parents"));
const remark_stringify_1 = __importDefault(require("remark-stringify"));
const remark_parse_1 = __importDefault(require("remark-parse"));
const vfile_1 = __importDefault(require("vfile"));
const startCommentValue = '<!-- notaza backlinks start -->';
const endCommentValue = '<!-- notaza backlinks end -->';
const parsingProcessor = unified_1.default().use(remark_parse_1.default);
const stringifyProcessor = unified_1.default().use(remark_stringify_1.default, { bullet: '*' });
function replaceBacklinks(pages, markdown, links) {
    const beforeStart = markdown.split(startCommentValue, 2).shift() || '';
    const endParts = markdown.split(endCommentValue, 2);
    const afterEnd = endParts.length === 1 ? '' : endParts.pop() || '';
    const newBacklinks = stringifyProcessor.stringify(backlinksNode(pages, links));
    return (beforeStart + newBacklinks + afterEnd).trimRight() + '\n';
}
function getInternalLinksTo(tree, page) {
    const links = [];
    unist_util_visit_parents_1.default(tree, 'link', (node, ancestors) => {
        if (node.url === './' + page.id + '.md') {
            const containingListItem = ancestors[2];
            if (containingListItem && containingListItem.type === 'listItem') {
                links.push(containingListItem);
            }
            else {
                links.push(unist_builder_1.default('listItem', { spread: false }, [node]));
            }
        }
    });
    return links;
}
function withoutFrontmatterAndBacklinks(markdown) {
    const beforeBacklinks = markdown.split(startCommentValue, 2).shift();
    const afterBacklinks = markdown.split(endCommentValue, 2).pop();
    const afterFrontmatter = beforeBacklinks === null || beforeBacklinks === void 0 ? void 0 : beforeBacklinks.split('\n---\n', 2).pop();
    return (afterFrontmatter || '') + (afterBacklinks || '');
}
function backlinksNode(pages, backlinks) {
    const u = unist_builder_1.default;
    const listItems = [...backlinks.entries()].map(([origin, contexts]) => {
        var _a;
        const linkText = ((_a = pages.get(origin)) === null || _a === void 0 ? void 0 : _a.title) || origin;
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
function getTitle(page) {
    var _a;
    const match = page.markdown.match(/\ntitle: (.*)\n/gm);
    return ((_a = match === null || match === void 0 ? void 0 : match.shift()) === null || _a === void 0 ? void 0 : _a.substring('title: '.length).trim()) || page.id;
}
function setLinkTitles(pages, markdown) {
    return markdown.replace(/\[\]\(\.\/([a-zA-Z0-9-_]+)\.md\)/g, (match, content) => {
        var _a;
        const title = ((_a = pages.get(content)) === null || _a === void 0 ? void 0 : _a.title) || content;
        return `[${title}](./${content}.md)`;
    });
}
function parsePage(page) {
    const parsed = parsingProcessor.parse(vfile_1.default(withoutFrontmatterAndBacklinks(page.markdown)));
    return Object.assign(Object.assign({}, page), { root: parsed, title: getTitle(page) });
}
exports.parsePage = parsePage;
function updateBacklinks(pages, page) {
    const links = new Map();
    for (const item of pages.values()) {
        if (item.id !== page.id) {
            const linksInItem = getInternalLinksTo(item.root, page);
            if (linksInItem.length > 0) {
                links.set(item.id, linksInItem);
            }
        }
    }
    return Object.assign(Object.assign({}, page), { markdown: setLinkTitles(pages, replaceBacklinks(pages, page.markdown, links)) });
}
exports.updateBacklinks = updateBacklinks;
//# sourceMappingURL=lib.js.map