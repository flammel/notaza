import { base64DecodeUnicode } from './util';

interface GithubApiFile {
    name: string;
    git_url: string;
}

interface GithubApiFileWithContent {
    content: string;
}

interface ApiPage {
    filename: string;
    content: string;
}

export interface ApiData {
    pages: ApiPage[];
    bookmarks: string;
    tweets: string;
}

export function loadApiData(user: string, repo: string, token: string): Promise<ApiData> {
    const baseUri = `https://api.github.com/repos/${user}/${repo}/contents`;
    const fetchOptions: RequestInit = {
        headers: {
            authorization: `token ${token}`,
            accept: 'application/vnd.github.v3+json',
        },
    };

    return Promise.all([
        fetchPages(baseUri, fetchOptions),
        fetchBookmarks(baseUri, fetchOptions),
        fetchTweets(baseUri, fetchOptions),
    ]).then(([pages, bookmarks, tweets]) => ({ pages, bookmarks, tweets }));
}

function fetchPages(baseUri: string, fetchOptions: RequestInit): Promise<ApiPage[]> {
    const fetchFiles = fetch(baseUri, fetchOptions).then((response) => response.json());
    const openCache = window.caches.open('notaza-file-cache-v1');
    return Promise.all([fetchFiles, openCache]).then(([files, cache]) =>
        Promise.all(
            files
                .filter((file: GithubApiFile) => file.name.endsWith('.md'))
                .map((file: GithubApiFile) => fetchPage(file, cache, fetchOptions)),
        ),
    );
}

function fetchBookmarks(baseUri: string, fetchOptions: RequestInit): Promise<string> {
    return fetch(`${baseUri}/bookmarks.toml`, fetchOptions)
        .then((response) => response.json())
        .then((json: GithubApiFileWithContent) => base64DecodeUnicode(json.content));
}

function fetchTweets(baseUri: string, fetchOptions: RequestInit): Promise<string> {
    return fetch(`${baseUri}/tweets.toml`, fetchOptions)
        .then((response) => response.json())
        .then((json: GithubApiFileWithContent) => base64DecodeUnicode(json.content));
}

function fetchPage(file: GithubApiFile, cache: Cache, fetchOptions: RequestInit): Promise<ApiPage> {
    const request = new Request(file.git_url, fetchOptions);
    return cache
        .match(request)
        .then((response) => response || fetch(request))
        .then((response) => {
            cache.put(request, response.clone());
            return response;
        })
        .then((response) => response.json())
        .then((fileWithContent: GithubApiFileWithContent) => ({
            filename: file.name,
            content: base64DecodeUnicode(fileWithContent.content),
        }));
}
