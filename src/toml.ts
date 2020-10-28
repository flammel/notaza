import { Bookmark, Tweet } from "./Page";

type ParserState<T = string> = ParserStateSuccess<T> | ParserStateError<T>;

interface ParserStateSuccess<T> {
    line: number;
    value: T;
    error: null;
}

interface ParserStateError<T> {
    line: number;
    value: null;
    error: string;
}

function parseTable(lines: string[], index: number, expected: string): ParserState {
    const line = lines[index];
    if (line === undefined) {
        return { line: index, value: null, error: 'expected table ' + expected + ' but got EOF' };
    }
    const match = line.match(new RegExp('\\[\\[(' + expected + ')\\]\\]'));
    if (match !== null) {
        return { line: index + 1, value: match[1], error: null };
    } else {
        return { line: index, value: null, error: 'expected table ' + expected + ' but got ' + line };
    }
}

function parseDate(lines: string[], index: number, key: string): ParserState {
    const line = lines[index];
    if (line === undefined) {
        return { line: index, value: null, error: 'expected key ' + key + ' but got EOF' };
    }
    const singleMatch = line.match(
        new RegExp('^' + key + ' = ([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z)$'),
    );
    if (singleMatch !== null) {
        return { line: index + 1, value: singleMatch[1], error: null };
    } else {
        return { line: index, value: null, error: 'expected date in key ' + key + ' but got ' + line };
    }
}

function parseKeyValue(lines: string[], index: number, key: string): ParserState {
    const line = lines[index];
    if (line === undefined) {
        return { line: index, value: null, error: 'expected key ' + key + ' but got EOF' };
    }
    const singleMatch = line.match(new RegExp('^' + key + " = (?:'''(.*)'''|'([^']*)'|\"([^\"]*)\")$"));
    if (singleMatch !== null) {
        return { line: index + 1, value: singleMatch[1] ?? singleMatch[2] ?? singleMatch[3], error: null };
    }
    const multiMatch = line.match(new RegExp('^' + key + " = '''$"));
    if (multiMatch === null) {
        return { line: index, value: null, error: 'expected key ' + key + ' but got ' + line };
    }
    const result = [];
    index++;
    while (lines[index] !== undefined && lines[index] !== "'''") {
        result.push(lines[index]);
        index++;
    }
    if (lines[index] === undefined) {
        return { line: index, value: null, error: "expected closing ''' but got EOF" };
    }
    return { line: index + 1, value: result.join('\n'), error: null };
}

function parseFile<T>(toml: string, parser: (lines: string[], index: number) => ParserState<T>): T[] {
    const lines = toml.split('\n');
    const result: T[] = [];
    for (let index = 0; index < lines.length; index++) {
        while (lines[index] === '') {
            index++;
        }
        if (lines[index] === undefined) {
            continue;
        }
        const parserResult = parser(lines, index);
        if (parserResult.value !== null) {
            result.push(parserResult.value);
            index = parserResult.line + 1;
        } else {
            console.error(parserResult.error + " on line " + parserResult.line);
            break;
        }
    }
    return result;
}

function tweetParser(lines: string[], index: number): ParserState<Tweet> {
    const table = parseTable(lines, index, 'tweets');
    const url = parseKeyValue(lines, table.line, 'url');
    const date = parseDate(lines, url.line, 'date');
    const tags = parseKeyValue(lines, date.line, 'tags');
    const tweet = parseKeyValue(lines, tags.line, 'tweet');
    const notes = parseKeyValue(lines, tweet.line, 'notes');
    if (
        url.value !== null &&
        date.value !== null &&
        tags.value !== null &&
        tweet.value !== null &&
        notes.value !== null
    ) {
        return {
            line: notes.line,
            value: new Tweet(
                url.value,
                date.value,
                tags.value.split(' ').map((tag) => tag.replace('#', '')),
                tweet.value,
                notes.value,
            ),
            error: null
        };
    } else {
        const error = [table, url, date, tags, tweet, notes].find(({ error }) => error !== null);
        return {
            line: error?.line ?? index,
            value: null,
            error: error?.error ?? 'unknown tweet parsing error',
        };
    }
}
function bookmarkParser(lines: string[], index: number): ParserState<Bookmark> {
    const table = parseTable(lines, index, 'bookmarks');
    const id = parseKeyValue(lines, table.line, 'id');
    const date = parseDate(lines, id.line, 'date');
    const url = parseKeyValue(lines, date.line, 'url');
    const title = parseKeyValue(lines, url.line, 'title');
    const tags = parseKeyValue(lines, title.line, 'tags');
    const description = parseKeyValue(lines, tags.line, 'description');
    if (
        id.value !== null &&
        date.value !== null &&
        url.value !== null &&
        title.value !== null &&
        tags.value !== null &&
        description.value !== null
    ) {
        return {
            line: description.line,
            value: new Bookmark(
                id.value,
                date.value,
                url.value,
                title.value,
                tags.value.split(' ').map((tag) => tag.replace('#', '')),
                description.value,
            ),
            error: null
        };
    } else {
        const error = [table, id, date, url, title, tags, description].find(({ error }) => error !== null);
        return {
            line: error?.line ?? index,
            value: null,
            error: error?.error ?? 'unknown bookmark parsing error',
        };
    }
}

export function parseTweets(toml: string): Tweet[] {
    return parseFile(toml, tweetParser);
}

export function parseBookmarks(toml: string): Bookmark[] {
    return parseFile(toml, bookmarkParser);
}
