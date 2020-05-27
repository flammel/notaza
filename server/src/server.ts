import express from 'express';
import exphbs from 'express-handlebars';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import cors from 'cors';
import * as MarkdownIt from 'markdown-it';
import * as Token from 'markdown-it/lib/token';
import { Page, PageId, readPage, updateBacklinks } from './lib';


dotenv.config();
const config = {
    contentDir: process.env.NOTAZA_CONTENT_DIRECTORY as string,
    port: process.env.NOTAZA_PORT as string,
};

async function savePage(page: Page): Promise<void> {
    return fs.promises.writeFile(path.resolve(config.contentDir, page.id + '.md'), page.raw);
}

// async function deletePage(id: string): Promise<void> {
//     return fs.promises.rename(
//         path.resolve(config.contentDir, id + '.md'),
//         path.resolve(config.contentDir, '_' + Date.now() + '-' + Math.round(Math.random() * 1e9) + '_' + id + '.md'),
//     );
// }

const links: MarkdownIt.PluginSimple = (md): void => {
    md.core.ruler.push('notaza_links', (state): boolean => {
        const fn = (token: Token): void => {
            if (token.children) {
                token.children.map(fn);
            }
            if (token.type === 'link_open') {
                const href = token.attrGet('href');
                const existingClasses = token.attrGet('class') || '';

                if (href?.startsWith('./') && href.endsWith('.md')) {
                    token.attrSet('class', existingClasses + ' internal');
                    token.attrSet('href', href?.slice(0, -3) || '');
                } else {
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
    private readonly mdit: MarkdownIt;
    constructor() {
        this.mdit = MarkdownIt.default({ html: true, linkify: true }).use(links) as MarkdownIt;
    }
    public render(markdown: string): string {
        return this.mdit.render(markdown);
    }
}

function makePage(id: string): Page {
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
    private pages: Map<PageId, Page> = new Map();

    constructor(private readonly contentDir: string) {}

    public getPages(): Page[] {
        return [...this.pages.values()];
    }

    public getPage(id: PageId): Page {
        return this.pages.get(id) || makePage(id);
    }

    public async save(id: PageId, raw: string): Promise<Page> {
        const page = updateBacklinks(this.pages, readPage(id, raw));
        this.pages.set(id, page);
        await savePage(page);
        return page;
    }

    public async loadPagesFromFileSystem(): Promise<void> {
        const fileNames = await fs.promises.readdir(this.contentDir);
        const loaded = fileNames
            .filter((fileName) => !fileName.startsWith('_') && fileName.endsWith('.md'))
            .map((fileName) => {
                const filePath = path.resolve(config.contentDir, fileName);
                return readPage(fileName.substring(0, fileName.length - 3), fs.readFileSync(filePath, 'utf-8'));
            });
        this.pages = new Map(loaded.map((page) => [page.id, page]));
    }
}

const renderer = new Renderer();
const repo = new Repo(config.contentDir);
repo.loadPagesFromFileSystem();

const app = express();
app.use(express.urlencoded());
app.use(cors());
app.use('/static', express.static('/home/flammel/code/notaza/client/dist'));
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

interface RenderedPage extends Page {
    html: string;
    htmlBacklinks: string;
}

function renderedPage(page: Page): RenderedPage {
    return {
        ...page,
        html: renderer.render(page.markdown),
        htmlBacklinks: renderer.render(page.rawBacklinks),
    };
}

app.get('/', async (req, res) => {
    try {
        const pages = repo.getPages();
        const page = repo.getPage(new Date().toISOString().substring(0, 10));
        res.render('show', { pages, page: renderedPage(page) });
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
});
app.get('/p/:id', async (req, res) => {
    try {
        const pages = repo.getPages();
        const page = repo.getPage(req.params.id || '');
        res.render(req.query.edit !== undefined ? 'edit' : 'show', { pages, page: renderedPage(page) });
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
});
app.post('/p/:id', async (req, res) => {
    try {
        const page = await repo.save(req.params.id || '', req.body.content);
        res.redirect(302, '/p/' + page.id);
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
});

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