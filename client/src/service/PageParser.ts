import { Page, PageId, Block } from '../types';
import { makeId } from '../util';

export class PageParser {
    public parse(id: PageId, rawMarkdown: string): Page {
        try {
            const [frontMatter, markdown] = this.splitRawMarkdown(rawMarkdown);
            const title = this.getTitle(frontMatter);
            const children = this.parseBlocks(markdown);
            return {
                id,
                title,
                children,
                rawMarkdown,
            };
        } catch (e) {
            return {
                id,
                title: id,
                children: [
                    {
                        id: makeId(),
                        content: 'Page could not be parsed: ' + (e instanceof Error ? e.message : ''),
                        children: [],
                    },
                ],
                rawMarkdown,
            };
        }
    }

    private getTitle(frontMatter: string): string {
        const match = frontMatter.match(/^title: (.*)$/gm);
        if (match !== null && match[0] !== undefined) {
            return match[0].substring('title: '.length);
        }
        return 'Untitled';
    }

    private parseBlocks(markdown: string): Block[] {
        if (markdown === '') {
            return [];
        }

        const lines = markdown.split('\n');

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

        const rootBlock: Block & { indentation: number } = {
            id: makeId(),
            content: '',
            children: [],
            indentation: -1,
        };
        const stack: Array<Block & { indentation: number }> = [rootBlock];
        for (const group of groups) {
            const peek = stack[stack.length - 1];
            const block = { id: makeId(), content: group[1].join('\n'), children: [], indentation: group[0] };
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

    private sanitizeMarkdown(markdown: string): string {
        const lines = [];
        let foundFirstBlock = false;
        for (const line of markdown.split('\n')) {
            if (line.startsWith('* ')) {
                foundFirstBlock = true;
            }
            if (foundFirstBlock) {
                if (line === '<!-- notaza backlinks start -->') {
                    break;
                }
                lines.push(line);
            }
        }
        return lines.join('\n').trim();
    }

    private splitRawMarkdown(rawMarkdown: string): [string, string] {
        const frontMatterParts = rawMarkdown.split('\n---\n', 3);
        if (frontMatterParts.length !== 2) {
            throw new Error('Splitting by "---" did not result in exactly two parts');
        }
        const frontMatter = frontMatterParts[0];
        const markdown = frontMatterParts[1];
        return [frontMatter, this.sanitizeMarkdown(markdown)];
    }
}
