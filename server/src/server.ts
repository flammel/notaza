import express from 'express';
import multer from 'multer';
import bodyParser from 'body-parser';
import { JsonDecoder } from 'ts.data.json';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
const config = {
    contentDir: process.env.NOTAZA_CONTENT_DIRECTORY as string,
    port: process.env.NOTAZA_PORT as string,
};

type PageId = string;
interface Page {
    id: PageId;
    markdown: string;
}

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

async function savePage(page: Page): Promise<void> {
    await fs.promises.writeFile(path.resolve(config.contentDir, page.id + '.md'), page.markdown);
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
        const allowed = ['image/png', 'image/jpeg', , 'image/gif', 'application/pdf'];
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
app.use('/static/', express.static(path.resolve(config.contentDir)));
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
        await savePage(payload);
        res.status(200).json({ success: true });
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
