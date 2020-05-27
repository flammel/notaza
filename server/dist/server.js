"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const express_1 = __importDefault(require("express"));
const express_handlebars_1 = __importDefault(require("express-handlebars"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv = __importStar(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const MarkdownIt = __importStar(require("markdown-it"));
const lib_1 = require("./lib");
dotenv.config();
const config = {
    contentDir: process.env.NOTAZA_CONTENT_DIRECTORY,
    port: process.env.NOTAZA_PORT,
};
function savePage(page) {
    return __awaiter(this, void 0, void 0, function* () {
        return fs_1.default.promises.writeFile(path_1.default.resolve(config.contentDir, page.id + '.md'), page.raw);
    });
}
// async function deletePage(id: string): Promise<void> {
//     return fs.promises.rename(
//         path.resolve(config.contentDir, id + '.md'),
//         path.resolve(config.contentDir, '_' + Date.now() + '-' + Math.round(Math.random() * 1e9) + '_' + id + '.md'),
//     );
// }
const links = (md) => {
    md.core.ruler.push('notaza_links', (state) => {
        const fn = (token) => {
            if (token.children) {
                token.children.map(fn);
            }
            if (token.type === 'link_open') {
                const href = token.attrGet('href');
                const existingClasses = token.attrGet('class') || '';
                if ((href === null || href === void 0 ? void 0 : href.startsWith('./')) && href.endsWith('.md')) {
                    token.attrSet('class', existingClasses + ' internal');
                    token.attrSet('href', (href === null || href === void 0 ? void 0 : href.slice(0, -3)) || '');
                }
                else {
                    token.attrSet('target', '_blank');
                    token.attrSet('rel', 'noreferrer noopener');
                    token.attrSet('class', existingClasses + ' external');
                }
            }
        };
        state.tokens.map(fn);
        return true;
    });
};
class Renderer {
    constructor() {
        this.mdit = MarkdownIt.default({ html: true, linkify: true }).use(links);
    }
    render(markdown) {
        return this.mdit.render(markdown);
    }
}
function makePage(id) {
    return {
        id,
        frontMatter: {
            title: id,
        },
        raw: `---\ntitle: ${id}\ncreated: ${new Date().toISOString()}\n---\n`,
        markdown: '',
        rawBacklinks: '',
    };
}
class Repo {
    constructor(contentDir) {
        this.contentDir = contentDir;
        this.pages = new Map();
    }
    getPages() {
        return [...this.pages.values()];
    }
    getPage(id) {
        return this.pages.get(id) || makePage(id);
    }
    save(id, raw) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = lib_1.updateBacklinks(this.pages, lib_1.readPage(id, raw));
            this.pages.set(id, page);
            yield savePage(page);
            return page;
        });
    }
    loadPagesFromFileSystem() {
        return __awaiter(this, void 0, void 0, function* () {
            const fileNames = yield fs_1.default.promises.readdir(this.contentDir);
            const loaded = fileNames
                .filter((fileName) => !fileName.startsWith('_') && fileName.endsWith('.md'))
                .map((fileName) => {
                const filePath = path_1.default.resolve(config.contentDir, fileName);
                return lib_1.readPage(fileName.substring(0, fileName.length - 3), fs_1.default.readFileSync(filePath, 'utf-8'));
            });
            this.pages = new Map(loaded.map((page) => [page.id, page]));
        });
    }
}
const renderer = new Renderer();
const repo = new Repo(config.contentDir);
repo.loadPagesFromFileSystem();
const app = express_1.default();
app.use(express_1.default.urlencoded());
app.use(cors_1.default());
app.use('/static', express_1.default.static('/home/flammel/code/notaza/client/dist'));
app.engine('handlebars', express_handlebars_1.default());
app.set('view engine', 'handlebars');
function renderedPage(page) {
    return Object.assign(Object.assign({}, page), { html: renderer.render(page.markdown), htmlBacklinks: renderer.render(page.rawBacklinks) });
}
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pages = repo.getPages();
        const page = repo.getPage(new Date().toISOString().substring(0, 10));
        res.render('show', { pages, page: renderedPage(page) });
    }
    catch (error) {
        res.status(500).json({ success: false, error });
    }
}));
app.get('/p/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pages = repo.getPages();
        const page = repo.getPage(req.params.id || '');
        res.render(req.query.edit !== undefined ? 'edit' : 'show', { pages, page: renderedPage(page) });
    }
    catch (error) {
        res.status(500).json({ success: false, error });
    }
}));
app.post('/p/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = yield repo.save(req.params.id || '', req.body.content);
        res.redirect(302, '/p/' + page.id);
    }
    catch (error) {
        res.status(500).json({ success: false, error });
    }
}));
app.listen(config.port, () => {
    console.log('Started server with config', config);
});
// app.get('/api/pages', async (req, res) => {
//     try {
//         const pages = await getPages();
//         res.status(200).json({ success: true, data: pages });
//     } catch (error) {
//         res.status(500).json({ success: false, error });
//     }
// });
// app.put('/api/pages', async (req, res) => {
//     try {
// const payload = await pageDecoder.decodePromise(req.body);
// const pages = await getParsedPages();
// const updated = updateBacklinks(pages, payload);
// await savePage(updated);
// res.status(200).json({ success: true, data: updated });
//     } catch (error) {
//         res.status(500).json({ success: false, error });
//     }
// });
// app.delete('/api/pages/:id', async (req, res) => {
//     try {
//         await deletePage(req.params.id);
//         res.status(200).json({ success: true });
//     } catch (error) {
//         res.status(500).json({ success: false, error });
//     }
// });
// app.post('/api/backlinks', async (req, res) => {
//     try {
//         const pages = await getParsedPages();
//         for (const page of pages.values()) {
//             const updated = updateBacklinks(pages, page);
//             await savePage(updated);
//         }
//         res.status(200).json({ success: true });
//     } catch (error) {
//         res.status(500).json({ success: false, error });
//     }
// });
// app.post('/api/files', (req, res) => {
//     upload(req, res, (err: unknown) => {
//         if (err) {
//             res.status(500).json({ success: false, error: err });
//         } else {
//             res.status(200).json({ success: true, data: { filename: req.file.filename } });
//         }
//     });
// });
// const upload = multer({
//     storage: multer.diskStorage({
//         destination: (req, file, cb) => {
//             cb(null, path.resolve(config.contentDir));
//         },
//         filename: (req, file, cb) => {
//             cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + '.' + file.mimetype.split('/').pop());
//         },
//     }),
//     fileFilter: (req, file, cb) => {
//         const allowed = ['image/png', 'image/jpeg', 'application/pdf'];
//         if (allowed.indexOf(file.mimetype) >= 0) {
//             cb(null, true);
//         } else {
//             cb(null, false);
//         }
//     },
// }).single('file');
//# sourceMappingURL=server.js.map