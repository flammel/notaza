const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config');

const contentDir = config.contentDirectory;
const port = config.port;

function getFiles(callback) {
    fs.readdir(contentDir, (err, files) => {
        const result = [];
        let unfinished = files.length;
        const finish = () => {
            unfinished--;
            if (unfinished <= 0) {
                callback(result);
            }
        }
        files.forEach((filename) => {
            const name = path.parse(filename).name;
            if (name.startsWith('_')) {
                finish();
                return;
            }
            const filepath = path.resolve(contentDir, filename);
            fs.stat(filepath, (err, stats) => {
                if (stats.isFile()) {
                    result.push({
                        uri: name,
                        markdown: fs.readFileSync(filepath, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n'),
                    });
                }
                finish();
            })
        });
    });
}

function writeFile(id, payload, onSuccess, onError) {
    if (id === payload.id) {
        fs.writeFile(
            path.resolve(contentDir, payload.id + '.md'),
            payload.markdown,
            (err) => {
                if (err) {
                    onError(500, err);
                } else {
                    onSuccess();
                }
            },
        );
    } else {
        onError(400, 'ID from URL does not match ID from body');
    }
}

function deletePage(uri, callback) {
    fs.rename(
        path.resolve(contentDir, uri + '.md'),
        path.resolve(contentDir, '_' + Date.now() + '-' + Math.round(Math.random() * 1e9) + '_' + uri + '.md'),
        () => callback()
    );
}

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, path.resolve(config.uploadTarget));
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
app.use(
    cors({
        origin: config.corsOrigin,
    }),
);
app.get('/pages', (req, res) => {
    getFiles((pages) => {
        res.status(200).json({success: true, data: pages});
    });
});
app.put('/pages/:uri', (req, res) => {
    writeFile(req.params.uri, req.body, () => {
        res.status(200).json({ success: true });
    }, (code, message) => {
        res.status(code).json({ success: false, error: message });
    });
});
app.delete('/pages/:uri', (req, res) => {
    deletePage(req.params.uri, () => {
        res.status(200).json({ success: true });
    });
});
app.post('/files', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            res.status(500).json({ success: false });
        } else {
            res.status(200).json({ success: true, data: { filename: req.file.filename } });
        }
    });
});
app.listen(port, () => console.log(`Listening on port ${port}!`));
