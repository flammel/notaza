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
const body_parser_1 = __importDefault(require("body-parser"));
const ts_data_json_1 = require("ts.data.json");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("./config"));
const storage = __importStar(require("./storage"));
const backlinks = __importStar(require("./backlinks"));
const pageDecoder = ts_data_json_1.JsonDecoder.object({
    id: ts_data_json_1.JsonDecoder.string,
    markdown: ts_data_json_1.JsonDecoder.string,
}, 'Page');
const upload = multer_1.default({
    storage: multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            cb(null, path_1.default.resolve(config_1.default.contentDir));
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
app.use(cors_1.default());
app.get('/api/pages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pages = yield storage.getPages();
        res.status(200).json({ success: true, data: pages });
    }
    catch (error) {
        res.status(500).json({ success: false, error });
    }
}));
app.put('/api/pages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payload = yield pageDecoder.decodePromise(req.body);
        yield storage.savePage(payload);
        const updated = yield backlinks.update(payload);
        res.status(200).json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, error });
    }
}));
app.delete('/api/pages/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield storage.deletePage(req.params.id);
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
app.listen(config_1.default.port, () => {
    console.log('Started server with config', config_1.default);
});
//# sourceMappingURL=server.js.map