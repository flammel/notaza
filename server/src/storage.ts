import fs from 'fs';
import path from 'path';
import config from './config';
import { Page } from './types';

export async function getPages(): Promise<Page[]> {
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

export async function savePage(page: Page): Promise<void> {
    await fs.promises.writeFile(path.resolve(config.contentDir, page.id + '.md'), page.markdown);
}

export async function deletePage(id: string): Promise<void> {
    return fs.promises.rename(
        path.resolve(config.contentDir, id + '.md'),
        path.resolve(config.contentDir, '_' + Date.now() + '-' + Math.round(Math.random() * 1e9) + '_' + id + '.md'),
    );
}
