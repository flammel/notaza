import { Pages, Page } from './types';

interface ApiPage {
    id: string;
    markdown: string;
}
type UploadedFile = { filename: string };
type SaveResult = { success: boolean };
type DeleteResult = { success: boolean };

export interface Api {
    loadPages(): Promise<Pages>;
    savePage(page: Page): Promise<void>;
    deletePage(page: Page): Promise<DeleteResult>;
    uploadFile(file: File): Promise<UploadedFile>;
}

export function makeApi(url: string): Api {
    return {
        loadPages(): Promise<Pages> {
            return fetch(url + '/pages')
                .then((r) => r.json())
                .then((json: { data: ApiPage[] }) => readPages(json.data));
        },
        savePage(page: Page): Promise<void> {
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
                        return Promise.resolve();
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

function readPages(apiPages: ApiPage[]): Pages {
    return apiPages.map(({ id, markdown }) => {
        const title = getTitle(markdown) || id;
        return {
            id,
            title,
            markdown,
        };
    });
}
