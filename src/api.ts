/*eslint @typescript-eslint/camelcase: ["error", {allow: ["git_url"]}]*/

import { base64DecodeUnicode, base64EncodeUnicode, hasOwnProperty } from './util';

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
    sha: string;
}

interface GithubApiFileWithContent {
    content: string;
}

interface GithubApiUpdateResponse {
    content: {
        sha: string;
    };
}

export class GithubApi implements Api {
    private readonly baseUri: string;
    private readonly fetchOptions: RequestInit;
    private readonly shaByFilename = new Map<string, string>();

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

    public updateFile(filename: string, content: string): Promise<void> {
        return fetch(this.baseUri + '/' + filename, {
            ...this.fetchOptions,
            method: 'PUT',
            body: JSON.stringify({
                message: 'Update ' + filename,
                content: base64EncodeUnicode(content),
                sha: this.shaByFilename.get(filename),
            }),
        })
            .then((response) => {
                if (response.status < 200 || response.status >= 300) {
                    throw new Error('Update request failed. Response: ' + response);
                } else {
                    return response.json();
                }
            })
            .then((json) => GithubApi.decodeUpdateResponse(json))
            .then(({ content }) => {
                this.shaByFilename.set(filename, content.sha);
            });
    }

    private fetchFile(apiFile: GithubApiFile, cache: Cache): Promise<ApiFile> {
        const request = new Request(apiFile.git_url, this.fetchOptions);
        this.shaByFilename.set(apiFile.name, apiFile.sha);
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
                hasOwnProperty(file, 'type') &&
                hasOwnProperty(file, 'sha')
            ) {
                const name = file.name;
                const git_url = file.git_url;
                const type = file.type;
                const sha = file.sha;
                if (
                    typeof name === 'string' &&
                    typeof git_url === 'string' &&
                    typeof type === 'string' &&
                    typeof sha === 'string'
                ) {
                    resolve({ name, git_url, type, sha });
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

    private static decodeUpdateResponse(response: unknown): Promise<GithubApiUpdateResponse> {
        return new Promise((resolve, reject) => {
            if (typeof response === 'object' && hasOwnProperty(response, 'content')) {
                const content = response.content;
                if (typeof content === 'object' && hasOwnProperty(content, 'sha')) {
                    const sha = content.sha;
                    if (typeof sha === 'string') {
                        resolve({ content: { sha } });
                        return;
                    }
                }
            }
            reject({ error: 'decodeUpdateResponse failed', response });
        });
    }
}
