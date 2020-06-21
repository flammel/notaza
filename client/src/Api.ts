import { PageParser } from './PageParser';
import { Page } from './Page';

interface ApiPage {
    id: string;
    markdown: string;
}
type UploadedFile = { filename: string };
type SaveResult = { success: true; data: ApiPage[] } | { success: false; error: string };
type DeleteResult = { success: boolean };

export class Api {
    constructor(private readonly url: string, private readonly pageParser: PageParser) {}

    public loadPages(): Promise<Page[]> {
        return fetch(this.url + '/pages')
            .then((r) => r.json())
            .then((json: { data: ApiPage[] }) =>
                json.data.map((page) => this.pageParser.parse(page.id, page.markdown)),
            );
    }

    public savePage(page: Page): Promise<Page[]> {
        return fetch(this.url + '/pages', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(page),
        })
            .then((res) => res.json())
            .then((json: SaveResult) => {
                if (json.success) {
                    return Promise.resolve([]);
                } else {
                    return Promise.reject();
                }
            })
            .catch(() => Promise.reject());
    }

    public deletePage(page: Page): Promise<DeleteResult> {
        return fetch(this.url + '/pages/' + page.id, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then((res) => res.json())
            .then((json: DeleteResult) => json);
    }

    public uploadFile(file: File): Promise<UploadedFile> {
        const formData = new FormData();
        formData.append('file', file);
        return fetch(this.url + '/files', {
            method: 'POST',
            body: formData,
        })
            .then((res: Response) => res.json())
            .then((json: { data: UploadedFile }) => json.data);
    }
}
