/*eslint @typescript-eslint/camelcase: ["error", {allow: ["git_url"]}]*/

import { base64DecodeUnicode, hasOwnProperty } from './util';

export interface Api {
    loadFiles: () => Promise<ApiFile[]>;
}

export interface ApiFile {
    filename: string;
    content: string;
}

export type ApiFiles = ApiFile[];

interface GithubApiFile {
    type: string;
    name: string;
    git_url: string;
}

interface GithubApiFileWithContent {
    content: string;
}

export class GithubApi implements Api {
    private readonly baseUri: string;
    private readonly fetchOptions: RequestInit;

    constructor(user: string, repo: string, token: string) {
        this.baseUri = `https://api.github.com/repos/${user}/${repo}/contents`;
        this.fetchOptions = {
            headers: {
                authorization: `token ${token}`,
                accept: 'application/vnd.github.v3+json',
            },
        };
    }

    public loadFiles(): Promise<ApiFile[]> {
        const fetchFiles = fetch(this.baseUri, this.fetchOptions).then((response) => response.json());
        const openCache = window.caches.open('notaza-file-cache-v1');
        return Promise.all([fetchFiles, openCache]).then(([files, cache]) => {
            const decoded: Promise<GithubApiFile[]> = Promise.all(
                files.map((file: unknown) => GithubApi.decodeApiFile(file)),
            );
            const filtered: Promise<GithubApiFile[]> = decoded.then((files) =>
                files.filter((file) => file.type === 'file'),
            );
            const fetched = filtered.then((files) => files.map((file) => this.fetchFile(file, cache)));
            return fetched.then((files) => Promise.all(files));
        });
    }

    private fetchFile(apiFile: GithubApiFile, cache: Cache): Promise<ApiFile> {
        const request = new Request(apiFile.git_url, this.fetchOptions);
        return cache
            .match(request)
            .then((response) => response || fetch(request))
            .then((response) => {
                cache.put(request, response.clone());
                return response;
            })
            .then((response) => response.json())
            .then((fileWithContent: unknown) => GithubApi.decodeApiFileWithContent(fileWithContent))
            .then((fileWithContent) => ({
                filename: apiFile.name,
                content: base64DecodeUnicode(fileWithContent.content),
            }));
    }

    private static decodeApiFile(file: unknown): Promise<GithubApiFile> {
        return new Promise((resolve, reject) => {
            if (
                typeof file === 'object' &&
                hasOwnProperty(file, 'name') &&
                hasOwnProperty(file, 'git_url') &&
                hasOwnProperty(file, 'type')
            ) {
                const name = file.name;
                const git_url = file.git_url;
                const type = file.type;
                if (typeof name === 'string' && typeof git_url === 'string' && typeof type === 'string') {
                    resolve({ name, git_url, type });
                    return;
                }
            }
            reject({ error: 'decodeApiFile failed', file });
        });
    }

    private static decodeApiFileWithContent(file: unknown): Promise<GithubApiFileWithContent> {
        return new Promise((resolve, reject) => {
            if (typeof file === 'object' && hasOwnProperty(file, 'content')) {
                const content = file.content;
                if (typeof content === 'string') {
                    resolve({ content });
                    return;
                }
            }
            reject({ error: 'decodeApiFileWithContent failed', file });
        });
    }
}
