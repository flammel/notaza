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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const unist_util_visit_1 = __importDefault(require("unist-util-visit"));
const to_vfile_1 = __importDefault(require("to-vfile"));
const unified_1 = __importDefault(require("unified"));
const remark_parse_1 = __importDefault(require("remark-parse"));
const remark_frontmatter_1 = __importDefault(require("remark-frontmatter"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const yaml_1 = __importDefault(require("yaml"));
const unist_builder_1 = __importDefault(require("unist-builder"));
const unist_util_visit_parents_1 = __importDefault(require("unist-util-visit-parents"));
const util_1 = __importDefault(require("./util"));
const remark_stringify_1 = __importDefault(require("remark-stringify"));
const pages = new Map();
const links = new Map();
const startCommentValue = '<!-- notaza backlinks start -->';
const endCommentValue = '<!-- notaza backlinks end -->';
function getFrontmatterNode(tree) {
    for (const child of tree.children) {
        if (child.type === 'yaml') {
            return child;
        }
    }
    return undefined;
}
function getFrontmatter(tree) {
    const node = getFrontmatterNode(tree);
    if (typeof (node === null || node === void 0 ? void 0 : node.value) === 'string') {
        const parsed = yaml_1.default.parse(node.value);
        if (parsed.title && parsed.created) {
            return parsed;
        }
    }
    return undefined;
}
function treeWithoutBacklinks(tree) {
    const newChildren = [];
    let inBacklinks = false;
    for (const child of tree.children) {
        if (child.type === 'html' && child.value === startCommentValue) {
            inBacklinks = true;
        }
        else if (child.type === 'html' && child.value === endCommentValue) {
            inBacklinks = false;
        }
        else if (!inBacklinks) {
            newChildren.push(child);
        }
    }
    return Object.assign(Object.assign({}, tree), { children: newChildren });
}
function getContainingListItem(ancestors) {
    for (let idx = ancestors.length - 1; idx >= 0; idx--) {
        if (ancestors[idx].type === 'listItem') {
            return ancestors[idx];
        }
    }
    return undefined;
}
function getBacklinkContext(linkNode, ancestors) {
    const u = unist_builder_1.default;
    const containingListItem = ancestors[2];
    if (containingListItem && containingListItem.type === 'listItem') {
        return containingListItem;
    }
    else {
        return u('listItem', { spread: false }, [
            linkNode
        ]);
    }
}
function backlinkNodes(backlinks) {
    const u = unist_builder_1.default;
    const listItems = [...backlinks.entries()].map(([origin, contexts]) => {
        const linkText = pages.get(origin) || origin;
        return u('listItem', { spread: false }, [
            u('link', { url: './' + origin }, [u('text', linkText)]),
            u('list', { ordered: false, spread: false }, contexts)
        ]);
    });
    return [
        u('html', { value: startCommentValue }),
        u('heading', { depth: 2 }, [u('text', 'Backlinks')]),
        u('list', { ordered: false, spread: false }, listItems),
        u('html', { value: endCommentValue })
    ];
}
function isParent(node) {
    return Array.isArray(node.children);
}
const extractInternalLinks = () => {
    return (tree, file) => {
        const fileName = file.basename;
        if (isParent(tree) && fileName) {
            unist_util_visit_parents_1.default(treeWithoutBacklinks(tree), 'link', (node, ancestors) => {
                if (node.url.indexOf('./') === 0 && isParent(node)) {
                    const targetFileName = node.url.substring(2);
                    const existing = links.get(targetFileName);
                    const context = getBacklinkContext(node, ancestors);
                    if (existing instanceof Map) {
                        const existing2 = existing.get(fileName);
                        if (existing2 instanceof Map) {
                            existing2.push(context);
                        }
                        else {
                            existing.set(fileName, [context]);
                        }
                    }
                    else {
                        links.set(targetFileName, new Map([[fileName, [context]]]));
                    }
                }
            });
        }
    };
};
const extractTitles = () => {
    return (tree, file) => {
        if (isParent(tree) && file.basename) {
            const frontmatter = getFrontmatter(tree);
            if (frontmatter) {
                pages.set(file.basename, frontmatter.title);
            }
        }
    };
};
const updateInternalLinkTitles = () => {
    return (tree) => {
        unist_util_visit_1.default(tree, 'link', (node) => {
            if (node.url.indexOf('./') === 0) {
                const targetFileName = node.url.substring(2);
                const title = pages.get(targetFileName) || targetFileName;
                node.children = [{
                        type: 'text',
                        value: title
                    }];
            }
        });
    };
};
const addBacklinks = () => {
    return (tree, file) => {
        if (isParent(tree) && file.basename) {
            tree.children = [...treeWithoutBacklinks(tree).children, ...backlinkNodes(links.get(file.basename) || new Map())];
        }
    };
};
function processFileExtract(filePath) {
    unified_1.default()
        .use(remark_parse_1.default)
        .use(remark_stringify_1.default)
        .use(util_1.default)
        .use(remark_frontmatter_1.default, ['yaml'])
        .use(extractTitles)
        .use(extractInternalLinks)
        .process(to_vfile_1.default.readSync(filePath));
}
function processFileWrite(filePath) {
    unified_1.default()
        .use(remark_parse_1.default)
        .use(remark_stringify_1.default)
        .use(util_1.default)
        .use(remark_frontmatter_1.default, ['yaml'])
        .use(addBacklinks)
        .use(updateInternalLinkTitles)
        .use([
        require('remark-lint'),
        [require('remark-lint-unordered-list-marker-style'), '*']
    ])
        .process(to_vfile_1.default.readSync(filePath), (err, file) => {
        if (file.path) {
            // console.log(String(file));
            fs_1.default.promises.writeFile(file.path, String(file));
        }
        else {
            console.error('No file path', file);
        }
    });
}
function processDir(dirPath) {
    var e_1, _a, e_2, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const dirEntries = yield fs_1.default.promises.readdir(dirPath);
        try {
            for (var dirEntries_1 = __asyncValues(dirEntries), dirEntries_1_1; dirEntries_1_1 = yield dirEntries_1.next(), !dirEntries_1_1.done;) {
                const dirEntry = dirEntries_1_1.value;
                const entryPath = path_1.default.join(dirPath, dirEntry);
                const stat = yield fs_1.default.promises.stat(entryPath);
                if (stat.isFile()) {
                    processFileExtract(entryPath);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (dirEntries_1_1 && !dirEntries_1_1.done && (_a = dirEntries_1.return)) yield _a.call(dirEntries_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        try {
            for (var dirEntries_2 = __asyncValues(dirEntries), dirEntries_2_1; dirEntries_2_1 = yield dirEntries_2.next(), !dirEntries_2_1.done;) {
                const dirEntry = dirEntries_2_1.value;
                const entryPath = path_1.default.join(dirPath, dirEntry);
                const stat = yield fs_1.default.promises.stat(entryPath);
                if (stat.isFile()) {
                    processFileWrite(entryPath);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (dirEntries_2_1 && !dirEntries_2_1.done && (_b = dirEntries_2.return)) yield _b.call(dirEntries_2);
            }
            finally { if (e_2) throw e_2.error; }
        }
    });
}
processDir(process.argv[2]);
//# sourceMappingURL=index.js.map