function parseKeyValue(line: string | undefined, key: string): string {
    const prefix = key + ':';
    if (line === undefined) {
        throw new Error(`Expected key "${key}" but got end of file`);
    }
    if (!line.startsWith(prefix)) {
        throw new Error(`Expected key "${key}" but got "${line}"`);
    }
    return line.substring(prefix.length).trim();
}

export function parseBookmarks(fileContent: string): Bookmark[] {
    const lines = fileContent.split('\n');
    const bookmarks: Bookmark[] = [];
    if (lines[lines.length - 1] === '') {
        lines.pop();
    }
    for (let index = 0; index < lines.length; index++) {
        if (lines[index] === '---') {
            index++;
        }
        if (lines[index] === undefined) {
            break;
        }
        const id = parseKeyValue(lines[index++], 'id');
        const date = parseKeyValue(lines[index++], 'date');
        const url = parseKeyValue(lines[index++], 'url');
        const title = parseKeyValue(lines[index++], 'title');
        const tags = parseKeyValue(lines[index++], 'tags')
            .split(' ')
            .map((tag) => tag.replace('#', ''));
        tags.unshift(date.substring(0, 10));
        const description = [parseKeyValue(lines[index++], 'description')];
        while (lines[index] !== '---') {
            description.push(lines[index++].trim());
        }
        if (description[0] === '') {
            description.shift();
        }
        bookmarks.push(new Bookmark(id, date, url, title, tags, description.join('\n')));
    }
    return bookmarks;
}

export class Bookmark {
    public constructor(
        public readonly id: string,
        public readonly date: string,
        public readonly url: string,
        public readonly title: string,
        public readonly tags: string[],
        public readonly description: string,
    ) {}
}
