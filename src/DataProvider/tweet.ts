import { ApiFiles } from '../api';
import { notazamd } from '../markdown';
import { Card, Page, Style } from '../model';
import * as toml from '../toml';
import { memoize, partial, withoutExtension } from '../util';
import { DataProvider, IndexEntry } from './types';
import { getFences, addTag, makePageFromFilename, updateFiles, pageNames, disjoint, getReferences } from './util';

interface Tweet {
    readonly url: string;
    readonly userHandle: string;
    readonly date: string;
    readonly tags: string[];
    readonly tweet: string;
    readonly notes: string;
}

function userHandle(url: string): string {
    const match = url.match(/^https:\/\/twitter\.com\/([^\/]+)\/.*$/);
    return match ? match[1] : url;
}

function parseTweet(tokens: toml.Token[], idx: number): Tweet | undefined {
    const header = tokens[idx];
    const url = tokens[idx + 1];
    const date = tokens[idx + 2];
    const tags = tokens[idx + 3];
    const tweet = tokens[idx + 4];
    const notes = tokens[idx + 5];
    if (
        header?.type === 'header' &&
        header?.header === 'tweets' &&
        url?.type === 'keyValue' &&
        date?.type === 'keyValue' &&
        tags?.type === 'keyValue' &&
        tweet?.type === 'keyValue' &&
        notes?.type === 'keyValue'
    ) {
        return {
            url: url.value,
            date: date.value,
            tags: tags.value
                .split(' ')
                .map((tag) => tag.replace('#', '').trim())
                .filter((tag) => tag !== ''),
            tweet: tweet.value,
            notes: notes.value,
            userHandle: userHandle(url.value),
        };
    }
}

function parseTweets(tomlStr: string): Tweet[] {
    const result = toml.parse(tomlStr.split('\n'));
    if (result.type === 'success') {
        const tweets: Tweet[] = [];
        for (let idx = 0; idx < result.tokens.length; idx = idx + 6) {
            const tweet = parseTweet(result.tokens, idx);
            if (tweet) {
                tweets.push(tweet);
            }
        }
        return tweets;
    } else {
        console.warn('Tweet parsing failed', result.error);
        return [];
    }
}

function toCard(tweet: Tweet): Card {
    return {
        type: 'tweet',
        url: tweet.url,
        title: '@' + tweet.userHandle,
        subtitle: 'on ' + tweet.date,
        tags: tweet.tags,
        content: [tweet.tweet.replace(/\n/g, '<br>'), notazamd().render(tweet.notes)],
    };
}

function searchFilter(query: string, tweet: Tweet): boolean {
    return (
        tweet.url.toLowerCase().includes(query) ||
        tweet.tweet.toLowerCase().includes(query) ||
        tweet.notes.toLowerCase().includes(query) ||
        tweet.tags.includes(query)
    );
}

const getOutgoingLinks = memoize(
    (tweet: Tweet): Set<string> => {
        return new Set([
            ...tweet.tags,
            ...getReferences(tweet.tweet),
            ...getReferences(tweet.notes),
            tweet.userHandle,
            tweet.date.substring(0, 10),
        ]);
    },
);

function relatedFilter(page: Page, tweet: Tweet): boolean {
    return !disjoint(pageNames(page), getOutgoingLinks(tweet));
}

export function tweetProvider(files: ApiFiles): DataProvider {
    const toml = files.find((file) => file.filename === 'tweets.toml');
    const tomlTweets = toml ? parseTweets(toml.content) : [];
    const mdTweets = getFences(files)
        .filter(({ info }) => info === 'tweet')
        .flatMap(({ file, content }) =>
            parseTweets(content).map((tweet) => addTag(withoutExtension(file.filename), tweet)),
        );
    const tweets = [...tomlTweets, ...mdTweets];
    const pages = new Map<string, Page>(
        tweets.flatMap((tweet) => tweet.tags.map((tag) => [tag + '.md', makePageFromFilename(tag + '.md')])),
    );
    return {
        indexEntries(): IndexEntry[] {
            return [...pages.values()].map((page) => ({
                url: page.filename,
                title: page.title,
            }));
        },
        page(filename): Page | undefined {
            return pages.get(filename);
        },
        related(page): Card[] {
            return tweets.filter(partial(relatedFilter, page)).map(toCard);
        },
        search(query): Card[] {
            return tweets.filter(partial(searchFilter, query.toLowerCase())).map(toCard);
        },
        styles(): Style[] {
            return [];
        },
        update(filename, content): DataProvider {
            return tweetProvider(updateFiles(files, { filename, content }));
        },
    };
}
