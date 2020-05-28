import express from 'express';
import multer from 'multer';
import bodyParser from 'body-parser';
import { JsonDecoder } from 'ts.data.json';
import cors from 'cors';
import path from 'path';
import { Page } from './types';
import config from './config';
import * as storage from './storage';
import * as backlinks from './backlinks';

const pageDecoder = JsonDecoder.object<Page>(
    {
        id: JsonDecoder.string,
        markdown: JsonDecoder.string,
    },
    'Page',
);

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
        const pages = await storage.getPages();
        res.status(200).json({ success: true, data: pages });
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
});
app.put('/api/pages', async (req, res) => {
    try {
        const payload = await pageDecoder.decodePromise(req.body);
        await storage.savePage(payload);
        const updated = await backlinks.update(payload);
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
});
app.delete('/api/pages/:id', async (req, res) => {
    try {
        await storage.deletePage(req.params.id);
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
