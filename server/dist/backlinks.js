"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = void 0;
const unified_1 = __importDefault(require("unified"));
const unist_builder_1 = __importDefault(require("unist-builder"));
const unist_util_visit_parents_1 = __importDefault(require("unist-util-visit-parents"));
const remark_stringify_1 = __importDefault(require("remark-stringify"));
const remark_parse_1 = __importDefault(require("remark-parse"));
const vfile_1 = __importDefault(require("vfile"));
const storage_1 = require("./storage");
const startCommentValue = '<!-- notaza backlinks start -->';
const endCommentValue = '<!-- notaza backlinks end -->';
const parsingProcessor = unified_1.default().use(remark_parse_1.default);
const stringifyProcessor = unified_1.default().use(remark_stringify_1.default, { bullet: '*' });
function getTitle(page) {
    var _a;
    const match = page.markdown.match(/\ntitle: (.*)\n/gm);
    return ((_a = match === null || match === void 0 ? void 0 : match.shift()) === null || _a === void 0 ? void 0 : _a.substring('title: '.length).trim()) || page.id;
}
function backlinksNode(links) {
    const u = unist_builder_1.default;
    const listItems = links.map(([page, link]) => {
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
function onlyContent(page) {
    return page.markdown.slice(page.markdown.indexOf('\n---\n') + 5, page.markdown.indexOf(startCommentValue));
}
function getLinksIn(page) {
    const parsed = parsingProcessor.parse(vfile_1.default(onlyContent(page)));
    const links = [];
    unist_util_visit_parents_1.default(parsed, 'link', (node, ancestors) => {
        if (typeof node.url === 'string' && node.url.startsWith('./') && node.url.endsWith('.md')) {
            const pageId = node.url.slice(2, -3);
            const containingListItem = ancestors[2];
            if (containingListItem && containingListItem.type === 'listItem') {
                links.push([pageId, containingListItem]);
            }
            else {
                links.push([pageId, unist_builder_1.default('listItem', { spread: false }, [node])]);
            }
        }
    });
    return links;
}
function replaceBacklinks(page, links) {
    const newBacklinks = stringifyProcessor.stringify(backlinksNode(links));
    const startIndex = page.markdown.indexOf(startCommentValue);
    const endIndex = page.markdown.lastIndexOf(endCommentValue);
    const beforeStart = page.markdown.slice(0, startIndex).trimRight();
    const afterEnd = page.markdown.slice(endIndex + endCommentValue.length).trimLeft();
    const newMarkdown = beforeStart + '\n\n' + newBacklinks + '\n\n' + afterEnd;
    return Object.assign(Object.assign({}, page), { markdown: newMarkdown });
}
function update(updated) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const pages = yield storage_1.getPages();
        const linksByTarget = new Map();
        for (const page of pages) {
            const linksInPage = getLinksIn(page);
            for (const [target, node] of linksInPage) {
                if (linksByTarget.has(target)) {
                    (_a = linksByTarget.get(target)) === null || _a === void 0 ? void 0 : _a.push([page, node]);
                }
                else {
                    linksByTarget.set(target, [[page, node]]);
                }
            }
        }
        for (const page of pages) {
            const links = linksByTarget.get(page.id);
            if (links) {
                yield storage_1.savePage(replaceBacklinks(page, links));
            }
        }
        return yield storage_1.getPages();
    });
}
exports.update = update;
//# sourceMappingURL=backlinks.js.map