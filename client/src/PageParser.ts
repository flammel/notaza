import _ from 'lodash';
import { Page, PageId, PageTitle, RawBlock } from './Page';

export class PageParser {
    public parse(id: PageId, rawMarkdown: string): Page {
        try {
            const [frontMatter, markdown] = this.splitRawMarkdown(rawMarkdown);
            const title = this.getTitle(frontMatter);
            const children = this.parseBlocks(markdown);
            const page = new Page({
                id,
                title,
                children,
            });
            return page;
        } catch (e) {
            console.warn(id, rawMarkdown);
            const page = new Page({
                id,
                title: id,
                children: [
                    { content: 'Page could not be parsed: ' + (e instanceof Error ? e.message : ''), children: [] },
                ],
            });
            return page;
        }
    }

    private getTitle(frontMatter: string): PageTitle {
        const match = frontMatter.match(/^title: (.*)$/gm);
        if (match !== null && match[0] !== undefined) {
            return match[0].substring('title: '.length);
        }
        return 'Untitled';
    }

    private parseBlocks(markdown: string): RawBlock[] {
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

        const rootBlock: RawBlock & { indentation: number } = { content: '', children: [], indentation: -1 };
        const stack: Array<RawBlock & { indentation: number }> = [rootBlock];
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

    private sanitizeMarkdown(markdown: string): string {
        const lines = markdown.split('\n');
        const withoutLeadingNonList = _.dropWhile(lines, (line) => !line.startsWith('* '));
        const withoutBacklinks = _.takeWhile(
            withoutLeadingNonList,
            (line) => line !== '<!-- notaza backlinks start -->',
        );
        const withoutTrailingEmpty = _.dropRightWhile(withoutBacklinks, (line) => line.trim() === '');
        return withoutTrailingEmpty.join('\n');
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