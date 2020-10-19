import { Bookmark, Tweet } from './Page';
import { Page } from './Page';

interface GithubApiFile {
    name: string;
    sha: string;
    git_url: string;
}

interface GithubApiFileWithContent {
    content: string;
}

interface JsonBookmark {
    id: string;
    date: string;
    url: string;
    title: string;
    tags: string;
    description: string | string[];
}

interface JsonTweet {
    url: string;
    date: string;
    tags: string;
    tweet: string | string[];
    notes: string | string[];
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
        return fetch(
            `https://api.github.com/repos/${this.user}/${this.repo}/contents/bookmarks.json`,
            this.fetchOptions,
        )
            .then((response) => response.json())
            .then((json: GithubApiFileWithContent) => JSON.parse(b64DecodeUnicode(json.content)))
            .then((json: JsonBookmark[]) => {
                return json.map(
                    (item) =>
                        new Bookmark(
                            item.id.trim(),
                            item.date.trim(),
                            item.url.trim(),
                            item.title.trim(),
                            item.tags.split(' ').map((tag: string) => tag.replace('#', '').trim()),
                            Array.isArray(item.description) ? item.description.join('\n\n') : item.description.trim(),
                        ),
                );
            });
    }

    public fetchTweets(): Promise<Tweet[]> {
        return fetch(`https://api.github.com/repos/${this.user}/${this.repo}/contents/tweets.json`, this.fetchOptions)
            .then((response) => response.json())
            .then((json: GithubApiFileWithContent) => JSON.parse(b64DecodeUnicode(json.content)))
            .then((json: JsonTweet[]) => {
                return json.map(
                    (item) =>
                        new Tweet(
                            item.url.trim(),
                            item.date.trim(),
                            item.tags.split(' ').map((tag: string) => tag.replace('#', '').trim()),
                            Array.isArray(item.tweet) ? item.tweet.join('\n') : item.tweet.trim(),
                            Array.isArray(item.notes) ? item.notes.join('\n\n') : item.notes.trim(),
                        ),
                );
            });
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
