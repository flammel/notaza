import { Page, Block } from './store/state';

export class PageSerializer {
    public serialize(page: Page): string {
        return [
            '---',
            'title: ' + page.title,
            '---',
            '',
            ...page.children.flatMap((child) => this.serializeBlock(child, 0)),
        ].join('\n');
    }

    private serializeBlock(block: Block, level: number): string[] {
        const lines = block.content.split('\n');
        return [
            ' '.repeat(level) + '* ' + lines[0],
            ...lines.slice(1).map((line) => ' '.repeat(level) + '  ' + line),
            ...block.children.flatMap((child) => this.serializeBlock(child, level + 4)),
        ];
    }
}
