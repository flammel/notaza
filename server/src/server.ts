import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import bodyParser from 'body-parser';
import { JsonDecoder } from 'ts.data.json';
import * as dotenv from 'dotenv';
import cors from 'cors';
import { updateBacklinks, Page, parsePage, PageId, ParsedPage } from './lib';

dotenv.config();
const config = {
    contentDir: process.env.NOTAZA_CONTENT_DIRECTORY as string,
    port: process.env.NOTAZA_PORT as string,
};

const pageDecoder = JsonDecoder.object<Page>(
    {
        id: JsonDecoder.string,
        markdown: JsonDecoder.string,
    },
    'Page',
);

async function getPages(): Promise<Page[]> {
    const fileNames = await fs.promises.readdir(config.contentDir);
    return fileNames
        .filter((fileName) => !fileName.startsWith('_') && fileName.endsWith('.md'))
        .map((fileName) => {
            const filePath = path.resolve(config.contentDir, fileName);
            return {
                id: fileName.substring(0, fileName.length - 3),
                markdown: fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n'),
            };
        });
}

async function getParsedPages(): Promise<Map<PageId, ParsedPage>> {
    return new Map((await getPages()).map((page) => [page.id, parsePage(page)]));
}

async function savePage(page: Page): Promise<void> {
    return fs.promises.writeFile(path.resolve(config.contentDir, page.id + '.md'), page.markdown);
}

async function deletePage(id: string): Promise<void> {
    return fs.promises.rename(
        path.resolve(config.contentDir, id + '.md'),
        path.resolve(config.contentDir, '_' + Date.now() + '-' + Math.round(Math.random() * 1e9) + '_' + id + '.md'),
    );
}

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, path.resolve(config.contentDir));
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + '.' + file.mimetype.split('/').pop());
        },
    }),
    fileFilter: (req, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'application/pdf'];
        if (allowed.indexOf(file.mimetype) >= 0) {
            cb(null, true);
        } else {
            cb(null, false);
        }
    },
}).single('file');

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.get('/api/pages', async (req, res) => {
    try {
        const pages = await getPages();
        res.status(200).json({ success: true, data: pages });
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
});
app.put('/api/pages', async (req, res) => {
    try {
        const payload = await pageDecoder.decodePromise(req.body);
        const pages = await getParsedPages();
        const updated = updateBacklinks(pages, payload);
        await savePage(updated);
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
});
app.delete('/api/pages/:id', async (req, res) => {
    try {
        await deletePage(req.params.id);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
});
app.post('/api/backlinks', async (req, res) => {
    try {
        const pages = await getParsedPages();
        for (const page of pages.values()) {
            const updated = updateBacklinks(pages, page);
            await savePage(updated);
        }
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
});
app.post('/api/files', (req, res) => {
    upload(req, res, (err: unknown) => {
        if (err) {
            res.status(500).json({ success: false, error: err });
        } else {
            res.status(200).json({ success: true, data: { filename: req.file.filename } });
        }
    });
});
app.listen(config.port, () => {
    console.log('Started server with config', config);
});
