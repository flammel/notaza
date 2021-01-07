import { ApiFile, ApiFiles } from '../api';
import { Card, Page, Style } from '../model';
import * as toml from '../toml';
import { curry, memoize, withoutExtension } from '../util';
import { DataProvider, IndexEntry, CardProducer } from './types';
import { getFences, addTag, updateFiles, pageNames, disjoint, getReferences } from './util';

interface Tweet {
    readonly filename: string;
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

function parseTweet(filename: string, tokens: toml.Token[], idx: number): Tweet | undefined {
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
            filename: filename,
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

function parseTweets(file: ApiFile, tomlStr: string): Tweet[] {
    const result = toml.parse(tomlStr.split('\n'));
    if (result.type === 'success') {
        const tweets: Tweet[] = [];
        for (let idx = 0; idx < result.tokens.length; idx = idx + 6) {
            const tweet = parseTweet(file.filename, result.tokens, idx);
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

function toCard(tweet: Tweet, markdownRenderer: (md: string) => string): Card {
    return {
        type: 'tweet',
        filename: tweet.filename,
        url: tweet.url,
        title: '@' + tweet.userHandle,
        subtitle: 'on ' + tweet.date,
        tags: tweet.tags,
        content: [tweet.tweet.replace(/\n/g, '<br>'), markdownRenderer(tweet.notes)],
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
    const tweets = getFences(files)
        .filter(({ info }) => info === 'tweet')
        .flatMap(({ file, content }) =>
            parseTweets(file, content).map((tweet) => addTag(withoutExtension(file.filename), tweet)),
        );
    const indexEntries = tweets.flatMap((tweet) => tweet.tags.map((tag) => ({ url: tag + '.md', title: tag })));
    return {
        indexEntries(): IndexEntry[] {
            return indexEntries;
        },
        page(): Page | undefined {
            return undefined;
        },
        related(page): CardProducer[] {
            return tweets.filter(curry(relatedFilter)(page)).map(curry(toCard));
        },
        search(query): CardProducer[] {
            return tweets.filter(curry(searchFilter)(query.toLowerCase())).map(curry(toCard));
        },
        styles(): Style[] {
            return [];
        },
        update(filename, content): DataProvider {
            return tweetProvider(updateFiles(files, { filename, content }));
        },
    };
}
