import { Page } from './Page';
interface ApiPage {
    filename: string;
    content: string;
}

function decodeResponse(json: unknown): Promise<ApiPage[]> {
    const assumed = json as { data: ApiPage[] };
    return Promise.resolve(assumed.data);
}

export class Api {
    public constructor(private readonly baseUrl: string) {}

    public loadPages(): Promise<Page[]> {
        return fetch(this.baseUrl)
            .then((r) => r.json())
            .then((json) => decodeResponse(json))
            .then((apiPages) => apiPages.map((apiPage) => new Page(apiPage.filename, apiPage.content)));
    }
}
