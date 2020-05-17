import { blocksFromMarkdown } from './Api';

describe('Block parsing', () => {
    test('Empty page', () => {
        expect(blocksFromMarkdown('\n\n')).toEqual([]);
    });
    test('Nested blocks', () =>
        expect(
            blocksFromMarkdown(`
* blk 1
  blk 1
  blk 1
  * blk 2
    * blk 3
    * blk 4
      * blk 5
    * blk 6
* blk 7
  * blk 8`),
        ).toEqual([
            {
                content: 'blk 1\nblk 1\nblk 1',
                children: [
                    {
                        content: 'blk 2',
                        children: [
                            { content: 'blk 3', children: [] },
                            { content: 'blk 4', children: [{ content: 'blk 5', children: [] }] },
                            { content: 'blk 6', children: [] },
                        ],
                    },
                ],
            },
            { content: 'blk 7', children: [{ content: 'blk 8', children: [] }] },
        ]));
});
