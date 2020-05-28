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
exports.deletePage = exports.savePage = exports.getPages = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("./config"));
function getPages() {
    return __awaiter(this, void 0, void 0, function* () {
        const fileNames = yield fs_1.default.promises.readdir(config_1.default.contentDir);
        return fileNames
            .filter((fileName) => !fileName.startsWith('_') && fileName.endsWith('.md'))
            .map((fileName) => {
            const filePath = path_1.default.resolve(config_1.default.contentDir, fileName);
            return {
                id: fileName.substring(0, fileName.length - 3),
                markdown: fs_1.default.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n'),
            };
        });
    });
}
exports.getPages = getPages;
function savePage(page) {
    return __awaiter(this, void 0, void 0, function* () {
        yield fs_1.default.promises.writeFile(path_1.default.resolve(config_1.default.contentDir, page.id + '.md'), page.markdown);
    });
}
exports.savePage = savePage;
function deletePage(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return fs_1.default.promises.rename(path_1.default.resolve(config_1.default.contentDir, id + '.md'), path_1.default.resolve(config_1.default.contentDir, '_' + Date.now() + '-' + Math.round(Math.random() * 1e9) + '_' + id + '.md'));
    });
}
exports.deletePage = deletePage;
//# sourceMappingURL=storage.js.map