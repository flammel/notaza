import { Bookmark, Tweet } from './Page';

class ParserError extends Error {
    constructor(expected: string, received: string, line: number) {
        super(`expected '${expected}' but got '${received}' on line ${line}`);
    }
}

interface ParserState<T = string> {
    line: number;
    value: T;
}

function parseTable(lines: string[], index: number, expected: string): ParserState {
    const line = lines[index];
    if (line === undefined) {
        throw new ParserError('table ' + expected, 'EOF', index);
    }
    const match = line.match(new RegExp('\\[\\[(' + expected + ')\\]\\]'));
    if (match !== null) {
        return { line: index + 1, value: match[1] };
    } else {
        throw new ParserError('table ' + expected, line, index);
    }
}

function parseDate(lines: string[], index: number, key: string): ParserState {
    const line = lines[index];
    if (line === undefined) {
        throw new ParserError('key ' + key, 'EOF', index);
    }
    const singleMatch = line.match(
        new RegExp('^' + key + ' = ([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z)$'),
    );
    if (singleMatch !== null) {
        return { line: index + 1, value: singleMatch[1] };
    } else {
        throw new ParserError('date in key ' + key, line, index);
    }
}

function parseKeyValue(lines: string[], index: number, key: string): ParserState {
    const line = lines[index];
    if (line === undefined) {
        throw new ParserError('key ' + key, 'EOF', index);
    }
    const singleMatch = line.match(new RegExp('^' + key + " = (?:'''(.*)'''|'([^']*)'|\"([^\"]*)\")$"));
    if (singleMatch !== null) {
        return { line: index + 1, value: singleMatch[1] ?? singleMatch[2] ?? singleMatch[3] };
    }
    const multiMatch = line.match(new RegExp('^' + key + " = '''$"));
    if (multiMatch === null) {
        throw new ParserError('key ' + key, line, index);
    }
    const result = [];
    index++;
    while (lines[index] !== undefined && lines[index] !== "'''") {
        result.push(lines[index]);
        index++;
    }
    if (lines[index] === undefined) {
        throw new ParserError("closing '''", 'EOF', index);
    }
    return { line: index + 1, value: result.join('\n') };
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
        result.push(parserResult.value);
        index = parserResult.line;
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
    return {
        line: notes.line,
        value: new Tweet(
            url.value,
            date.value,
            tags.value.split(' ').map((tag) => tag.replace('#', '')),
            tweet.value,
            notes.value,
        ),
    };
}
function bookmarkParser(lines: string[], index: number): ParserState<Bookmark> {
    const table = parseTable(lines, index, 'bookmarks');
    const id = parseKeyValue(lines, table.line, 'id');
    const date = parseDate(lines, id.line, 'date');
    const url = parseKeyValue(lines, date.line, 'url');
    const title = parseKeyValue(lines, url.line, 'title');
    const tags = parseKeyValue(lines, title.line, 'tags');
    const description = parseKeyValue(lines, tags.line, 'description');
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
    };
}

export function parseTweets(toml: string): Tweet[] {
    return parseFile(toml, tweetParser);
}

export function parseBookmarks(toml: string): Bookmark[] {
    return parseFile(toml, bookmarkParser);
}
