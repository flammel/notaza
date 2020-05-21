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
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const ts_data_json_1 = require("ts.data.json");
const dotenv = __importStar(require("dotenv"));
const lib_1 = require("./lib");
dotenv.config();
const config = {
    contentDir: process.env.NOTAZA_CONTENT_DIRECTORY,
    port: process.env.NOTAZA_PORT,
    corsOrigin: process.env.NOTAZA_CORS_ORIGIN,
};
const pageDecoder = ts_data_json_1.JsonDecoder.object({
    id: ts_data_json_1.JsonDecoder.string,
    markdown: ts_data_json_1.JsonDecoder.string,
}, 'Page');
function getPages() {
    return __awaiter(this, void 0, void 0, function* () {
        const fileNames = yield fs_1.default.promises.readdir(config.contentDir);
        return fileNames
            .filter((fileName) => !fileName.startsWith('_') && fileName.endsWith('.md'))
            .map((fileName) => {
            const filePath = path_1.default.resolve(config.contentDir, fileName);
            return {
                id: fileName.substring(0, fileName.length - 3),
                markdown: fs_1.default.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n'),
            };
        });
    });
}
function getParsedPages() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Map((yield getPages()).map((page) => [page.id, lib_1.parsePage(page)]));
    });
}
function savePage(page) {
    return fs_1.default.promises.writeFile(path_1.default.resolve(config.contentDir, page.id + '.md'), page.markdown);
}
function deletePage(id) {
    return fs_1.default.promises.rename(path_1.default.resolve(config.contentDir, id + '.md'), path_1.default.resolve(config.contentDir, '_' + Date.now() + '-' + Math.round(Math.random() * 1e9) + '_' + id + '.md'));
}
const upload = multer_1.default({
    storage: multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            cb(null, path_1.default.resolve(config.contentDir));
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + '.' + file.mimetype.split('/').pop());
        },
    }),
    fileFilter: (req, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'application/pdf'];
        if (allowed.indexOf(file.mimetype) >= 0) {
            cb(null, true);
        }
        else {
            cb(null, false);
        }
    },
}).single('file');
const app = express_1.default();
app.use(body_parser_1.default.json());
app.use(cors_1.default({
    origin: process.env.NOTAZA_CORS_ORIGIN,
}));
app.get('/api/pages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pages = yield getPages();
        res.status(200).json({ success: true, data: pages });
    }
    catch (error) {
        res.status(500).json({ success: false, error });
    }
}));
app.put('/api/pages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payload = yield pageDecoder.decodePromise(req.body);
        const pages = yield getParsedPages();
        const updated = lib_1.updateBacklinks(pages, payload);
        savePage(updated);
        res.status(200).json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, error });
    }
}));
app.delete('/api/pages/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield deletePage(req.params.id);
        res.status(200).json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error });
    }
}));
app.post('/api/backlinks', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pages = yield getParsedPages();
        for (const page of pages.values()) {
            const updated = lib_1.updateBacklinks(pages, page);
            yield savePage(updated);
        }
        res.status(200).json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error });
    }
}));
app.post('/api/files', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({ success: true, data: { filename: req.file.filename } });
        }
    });
});
app.listen(config.port, () => {
    console.log('Started server with config', config);
});
//# sourceMappingURL=server.js.map