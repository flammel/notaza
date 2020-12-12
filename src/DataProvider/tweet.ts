import { ApiFiles } from '../api';
import { notazamd } from '../markdown';
import { Card, Page, Style } from '../model';
import * as toml from '../toml';
import { notUndefined, partial, withoutExtension } from '../util';
import { DataProvider } from './types';
import {
    getFences,
    addTag,
    pageAliases,
    containsReference,
    makePageFromFilename,
    updateFiles,
    relatedByDate,
} from './util';

interface Tweet {
    readonly url: string;
    readonly userHandle: string;
    readonly date: string;
    readonly tags: string[];
    readonly tweet: string;
    readonly notes: string;
}

const tweetsParser = toml.many(
    toml.map(
        toml.sequence([
            toml.tableHeader('tweets'),
            toml.singleLineStringKeyValue('url'),
            toml.dateKeyValue('date'),
            toml.singleLineStringKeyValue('tags'),
            toml.oneOf(toml.singleLineStringKeyValue('tweet'), toml.multiLineStringKeyValue('tweet')),
            toml.oneOf(toml.singleLineStringKeyValue('notes'), toml.multiLineStringKeyValue('notes')),
            toml.optional(toml.emptyLine()),
        ]),
        ([, url, date, tags, tweet, notes]) => {
            if (url !== null && date !== null && tags !== null && tweet !== null && notes !== null) {
                return {
                    url,
                    date,
                    tags: tags
                        .split(' ')
                        .map((tag) => tag.replace('#', '').trim())
                        .filter((tag) => tag !== ''),
                    tweet,
                    notes,
                    userHandle: userHandle(url),
                };
            } else {
                return undefined;
            }
        },
    ),
);

function userHandle(url: string): string {
    const match = url.match(/^https:\/\/twitter\.com\/([^\/]+)\/.*$/);
    return match ? match[1] : url;
}

function parseTweets(toml: string): Tweet[] {
    const result = tweetsParser({ lines: toml.split('\n'), index: 0 });
    if (result.success) {
        return result.value.filter(notUndefined);
    } else {
        console.warn('Tweet parsing failed', result.expected);
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

function relatedFilter(page: Page, tweet: Tweet): boolean {
    return (
        tweet.tags.includes(page.id) ||
        containsReference(tweet.tweet, page) ||
        containsReference(tweet.notes, page) ||
        pageAliases(page).some((alias) => tweet.tags.includes(alias)) ||
        tweet.userHandle === page.id ||
        relatedByDate(page, tweet)
    );
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
        pages(): Page[] {
            return [...pages.values()];
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
