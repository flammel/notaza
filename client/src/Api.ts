import { Pages, Page, Block } from './types';

interface ApiPage {
    id: string;
    markdown: string;
}
type UploadedFile = { filename: string };
type SaveResult = { success: true; data: ApiPage[] } | { success: false; error: string };
type DeleteResult = { success: boolean };

export interface Api {
    loadPages(): Promise<Pages>;
    savePage(page: Page): Promise<Pages>;
    deletePage(page: Page): Promise<DeleteResult>;
    uploadFile(file: File): Promise<UploadedFile>;
}

export function makeApi(url: string): Api {
    return {
        loadPages(): Promise<Pages> {
            return fetch(url + '/pages')
                .then((r) => r.json())
                .then((json: { data: ApiPage[] }) => json.data.map(readPage));
        },
        savePage(page: Page): Promise<Pages> {
            return fetch(url + '/pages', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(page),
            })
                .then((res) => res.json())
                .then((json: SaveResult) => {
                    if (json.success) {
                        return Promise.resolve(json.data.map(readPage));
                    } else {
                        return Promise.reject();
                    }
                })
                .catch(() => Promise.reject());
        },
        deletePage(page: Page): Promise<DeleteResult> {
            return fetch(url + '/pages/' + page.id, {
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
}

function getTitle(markdown: string): string | undefined {
    const match = markdown.match(/^title: (.*)$/gm);
    if (match !== null && match[0] !== undefined) {
        return match[0].substring('title: '.length);
    }
    return undefined;
}

function readPage({ id, markdown }: ApiPage): Page {
    const afterFrontmatter = markdown.split('\n---\n').pop() || markdown;
    const shifted = afterFrontmatter.split('\n<!-- notaza backlinks start -->\n').shift();
    const beforeBacklinks = shifted === undefined ? afterFrontmatter : shifted;
    let blocks: Block[];
    try {
        blocks = parseBlocks(beforeBacklinks);
    } catch (e) {
        console.error(e);
        blocks = [{ content: 'parse error: ' + (e instanceof Error ? e.message : ''), children: [] }];
    }
    if (blocks.length === 0) {
        blocks = [{ content: '', children: [] }];
    }
    blocks.push({ content: 'foo #bar lorem', children: [] });
    blocks.push({ content: '[] foo #bar lorem', children: [] });
    blocks.push({ content: '[x] foo #bar lorem', children: [] });
    return {
        id,
        title: getTitle(markdown) || id,
        children: blocks,
        created: '',
    };
}

function parseBlocks(markdown: string): Block[] {
    const lines = markdown.split('\n');
    while (lines[0] !== undefined && lines[0].trim() === '') {
        lines.shift();
    }
    while (lines[lines.length - 1] !== undefined && lines[lines.length - 1].trim() === '') {
        lines.pop();
    }

    const groups: [number, string[]][] = [];
    for (const line of lines) {
        if (line.match(/^ *\* .*$/) !== null) {
            const indentation = line.indexOf('*');
            groups.push([indentation, [line.substring(indentation + 2)]]);
        } else {
            const group = groups[groups.length - 1];
            if (group === undefined) {
                throw new Error('No group');
            }
            group[1].push(line.substring(group[0] + 2));
        }
    }

    const rootBlock: Block & { indentation: number } = { content: '', children: [], indentation: -1 };
    const stack: Array<Block & { indentation: number }> = [rootBlock];
    for (const group of groups) {
        const peek = stack[stack.length - 1];
        const block = { content: group[1].join('\n'), children: [], indentation: group[0] };
        if (block.indentation > peek.indentation) {
            peek.children.push(block);
            stack.push(block);
        } else {
            let parent = stack.pop();
            while (parent !== undefined && block.indentation <= parent.indentation) {
                parent = stack.pop();
            }
            if (parent === undefined) {
                throw new Error('No parent');
            }
            parent.children.push(block);
            stack.push(parent);
            stack.push(block);
        }
        stack.push(block);
    }

    return rootBlock.children;
}
