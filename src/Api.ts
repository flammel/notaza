import { Bookmark, parseBookmarks } from './Bookmarks';
import { Page } from './Page';

interface GithubApiFile {
    name: string;
    sha: string;
    git_url: string;
}

interface GithubApiFileWithContent {
    content: string;
}

// https://stackoverflow.com/a/30106551
function b64DecodeUnicode(str: string): string {
    return decodeURIComponent(
        atob(str)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join(''),
    );
}

export class Api {
    private readonly fetchOptions: RequestInit;
    public constructor(private readonly user: string, private readonly repo: string, token: string) {
        this.fetchOptions = {
            headers: {
                authorization: `token ${token}`,
                accept: 'application/vnd.github.v3+json',
            },
        };
    }

    public loadPages(): Promise<Page[]> {
        const fetchFiles = fetch(
            `https://api.github.com/repos/${this.user}/${this.repo}/contents`,
            this.fetchOptions,
        ).then((response) => response.json());
        const openCache = window.caches.open('notaza-file-cache-v1');
        return Promise.all([fetchFiles, openCache]).then(([files, cache]) =>
            Promise.all(
                files
                    .filter((file: GithubApiFile) => file.name.endsWith('.md'))
                    .map((file: GithubApiFile) => this.fetchFile(file, cache)),
            ),
        );
    }

    public fetchBookmarks(): Promise<Bookmark[]> {
        return fetch(`https://api.github.com/repos/${this.user}/${this.repo}/contents/bookmarks.txt`, this.fetchOptions)
            .then((response) => response.json())
            .then((json) => parseBookmarks(b64DecodeUnicode(json.content)));
    }

    private fetchFile(file: GithubApiFile, cache: Cache): Promise<Page> {
        const request = new Request(file.git_url, this.fetchOptions);
        return cache
            .match(request)
            .then((response) => response || fetch(request))
            .then((response) => {
                cache.put(request, response.clone());
                return response;
            })
            .then((response) => response.json())
            .then(
                (fileWithContent: GithubApiFileWithContent) =>
                    new Page(file.name, file.sha, b64DecodeUnicode(fileWithContent.content)),
            );
    }
}
