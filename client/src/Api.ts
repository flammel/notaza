import { Pages, Page } from './types';

interface ApiPage {
    id: string;
    markdown: string;
}
type UploadedFile = { filename: string };
type SaveResult = { success: true; data: ApiPage[] } | { success: false; error: string };
type DeleteResult = { success: boolean };

export interface Api {
    loadPages(): Promise<Pages>;
    savePage(page: Page): Promise<Pages>;
    deletePage(page: Page): Promise<DeleteResult>;
    uploadFile(file: File): Promise<UploadedFile>;
}

export function makeApi(url: string): Api {
    return {
        loadPages(): Promise<Pages> {
            return fetch(url + '/pages')
                .then((r) => r.json())
                .then((json: { data: ApiPage[] }) => json.data.map(readPage));
        },
        savePage(page: Page): Promise<Pages> {
            return fetch(url + '/pages', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(page),
            })
                .then((res) => res.json())
                .then((json: SaveResult) => {
                    if (json.success) {
                        return Promise.resolve(json.data.map(readPage));
                    } else {
                        return Promise.reject();
                    }
                })
                .catch(() => Promise.reject());
        },
        deletePage(page: Page): Promise<DeleteResult> {
            return fetch(url + '/pages/' + page.id, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
                .then((res) => res.json())
                .then((json: DeleteResult) => json);
        },
        uploadFile(file: File): Promise<UploadedFile> {
            const formData = new FormData();
            formData.append('file', file);
            return fetch(url + '/files', {
                method: 'POST',
                body: formData,
            })
                .then((res: Response) => res.json())
                .then((json: { data: UploadedFile }) => json.data);
        },
    };
}

function getTitle(markdown: string): string | undefined {
    const match = markdown.match(/^title: (.*)$/gm);
    if (match && match[0]) {
        return match[0].substring('title: '.length);
    }
    return undefined;
}

function getSearchable(markdown: string): string[] {
    const afterFrontmatter = markdown.split('\n---\n').pop() || markdown;
    const beforeBacklinks = afterFrontmatter.split('\n<!-- notaza backlinks start -->\n').shift() || afterFrontmatter;
    return beforeBacklinks.split('\n').map((line) => line.replace('*', '').trim());
}

function readPage({ id, markdown }: ApiPage): Page {
    return {
        id,
        title: getTitle(markdown) || id,
        markdown,
        searchable: getSearchable(markdown),
    };
}
