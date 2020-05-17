import { Pages, Page, Block } from './types';
import { makeBlockId } from './blockId';

interface ApiPage {
    uri: string;
    markdown: string;
}
type UploadedFile = { filename: string };
type SaveResult = { success: boolean };
type DeleteResult = { success: boolean };

export interface Api {
    loadPages(): Promise<Pages>;
    savePage(page: Page): Promise<SaveResult>;
    deletePage(page: Page): Promise<DeleteResult>;
    uploadFile(file: File): Promise<UploadedFile>;
}

let api: Api | undefined;

export function configureApi(url: string): Api {
    api = {
        loadPages(): Promise<Pages> {
            return fetch(url + '/pages')
                .then((r) => r.json())
                .then((json: { data: ApiPage[] }) => fromApiPages(json.data));
        },
        savePage(page: Page): Promise<SaveResult> {
            return fetch(url + '/pages/' + page.url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(page),
            })
                .then((res) => res.json())
                .then((json: SaveResult) => json);
        },
        deletePage(page: Page): Promise<DeleteResult> {
            return fetch(url + '/pages/' + page.url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
                .then((res) => res.json())
                .then((json: DeleteResult) => json);
        },
        uploadFile(file: File): Promise<UploadedFile> {
            const formData = new FormData();
            formData.append('file', file);
            return fetch(url + '/files', {
                method: 'POST',
                body: formData,
            })
                .then((res: Response) => res.json())
                .then((json: { data: UploadedFile }) => json.data);
        },
    };
    return api;
}

export function useApi(): Api {
    if (!api) {
        throw new Error('api not configured');
    }
    return api;
}

function splitMarkdown(markdown: string): [string, string] {
    const lines = markdown.split('\n');
    lines.shift();
    const title = (lines.shift() ?? '').substring('title: '.length).replace(/^"(.*)"$/, '$1');
    lines.shift();
    while (lines[0] === '') {
        lines.shift();
    }
    return [title, lines.join('\n')];
}

function fromApiPages(apiPages: ApiPage[]): Pages {
    return apiPages.map(({ uri, markdown }) => {
        const [title, content] = splitMarkdown(markdown);
        return {
            id: uri,
            url: uri,
            title,
            block: blocksFromMarkdown(content),
        };
    });
}

export function blocksFromMarkdown(markdown: string): Block {
    const rootBlock: Block = { id: makeBlockId(), content: '', children: [] };
    const lines = markdown.split('\n');
    const regex = new RegExp(/^( *)\* (.*)$/);

    // Remove empty lines between frontmatter and first block
    while (lines[0] === '') {
        lines.shift();
    }

    // Group lines into block contents
    const groupedLines: [number, string][] = [];
    for (const line of lines) {
        const match = line.match(regex);
        if (match) {
            groupedLines.push([match[1].length, match[2]]);
        } else {
            const current = groupedLines.pop();
            if (!current) {
                console.warn('no line group', markdown);
                return rootBlock;
            }
            current[1] += '\n' + line.trimLeft();
            groupedLines.push(current);
        }
    }

    // Build tree
    const stack: [number, Block][] = [];
    for (const [level, content] of groupedLines) {
        const top = stack.pop() ?? [-1, rootBlock];
        const newBlock = { id: makeBlockId(), content, children: [] };
        if (top[0] < level) {
            top[1].children.push(newBlock);
            stack.push(top);
            stack.push([level, newBlock]);
        } else {
            let parent = stack.pop();
            while (parent && parent[0] >= level) {
                parent = stack.pop();
            }
            parent = parent ?? [-1, rootBlock];
            parent[1].children.push(newBlock);
            stack.push(parent);
            stack.push([level, newBlock]);
        }
    }

    return rootBlock;
}
