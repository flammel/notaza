import Token from 'markdown-it/lib/token';
import { ApiFiles } from '../api';
import { notazamd } from '../markdown';
import { Page, FrontMatter, Style, Card } from '../model';
import { memoize, withoutExtension, partial } from '../util';
import { CardProducer, DataProvider, IndexEntry } from './types';
import { pageAliases, getFences, updateFiles, getReferences, disjoint, pageNames } from './util';

interface Block {
    tokens: Token[];
}

const getBlocks = memoize((page: Page): Block[] => {
    const tokens = notazamd().parse(page.body);
    let open = 0;
    const blocks = [];
    let block = [];
    for (const token of tokens) {
        if (
            (token.type === 'list_item_open' && token.level === 1) ||
            (token.type === 'paragraph_open' && token.level === 0)
        ) {
            open++;
            continue;
        }
        if (
            (token.type === 'list_item_close' && token.level === 1) ||
            (token.type === 'paragraph_close' && token.level === 0)
        ) {
            open--;
            if (open === 0) {
                blocks.push({ tokens: block });
                block = [];
                continue;
            }
        }
        if (open > 0) {
            block.push(token);
        }
    }
    return blocks;
});

type BlockFilter = (block: Block) => boolean;

function toCard(blockFilter: BlockFilter, page: Page): CardProducer {
    const blocks = getBlocks(page).filter(blockFilter);
    return (): Card => ({
        type: 'page',
        url: page.filename,
        title: page.title,
        tags: [],
        content: [`<ul>${blocks.map((b) => '<li>' + notazamd().renderTokens(b.tokens) + '</li>').join('')}</ul>`],
    });
}

function searchFilter(query: string, page: Page): boolean {
    return page.title.toLowerCase().includes(query) || page.body.toLowerCase().includes(query);
}

function relatedFilter(page: Page, other: Page): boolean {
    return other.filename !== page.filename && !disjoint(pageNames(page), getReferences(other.body));
}

function relatedMdFilter(page: Page, block: Block): boolean {
    return !disjoint(pageNames(page), getReferences(block.tokens));
}

function searchMdFilter(query: string, block: Block): boolean {
    return block.tokens.some((token) => token.content.toLocaleLowerCase().includes(query));
}

function parseFrontMatter(frontMatter: string): FrontMatter {
    return Object.fromEntries(
        frontMatter
            .split('\n')
            .map((line) => line.split(':'))
            .map(([key, ...value]) => [key, value.join(':').trim()]),
    );
}

function bodyAndFrontMatter(content: string): { frontMatter: FrontMatter; body: string } {
    const [frontMatterStr, ...bodyParts] = content.split('\n---\n');
    if (bodyParts.length < 1 || !frontMatterStr.startsWith('---\n')) {
        return { frontMatter: {}, body: content };
    } else {
        return { frontMatter: parseFrontMatter(frontMatterStr.substring(4)), body: bodyParts.join('\n---\n') };
    }
}

function makePage(filename: string, content: string): Page {
    const { frontMatter, body } = bodyAndFrontMatter(content);
    return {
        filename,
        id: withoutExtension(filename),
        frontMatter,
        body,
        title: frontMatter.title || filename,
        raw: content,
    };
}

export function pageProvider(files: ApiFiles): DataProvider {
    const pages = new Map(
        files
            .filter((apiFile) => apiFile.filename.endsWith('.md'))
            .map((apiFile) => makePage(apiFile.filename, apiFile.content))
            .map((page) => [page.filename, page]),
    );
    const aliases = new Map([...pages.values()].flatMap((page) => pageAliases(page).map((alias) => [alias, page])));
    return {
        indexEntries(): IndexEntry[] {
            return [...pages.values()].map((page) => ({
                url: page.filename,
                title: page.title,
            }));
        },
        page(filename): Page | undefined {
            return pages.get(filename) ?? aliases.get(withoutExtension(filename));
        },
        related(page): CardProducer[] {
            return [...pages.values()]
                .filter(partial(relatedFilter, page))
                .map(partial(toCard, partial(relatedMdFilter, page)));
        },
        search(query): CardProducer[] {
            return [...pages.values()]
                .filter(partial(searchFilter, query.toLowerCase()))
                .map(partial(toCard, partial(searchMdFilter, query)));
        },
        styles(): Style[] {
            return getFences([...files.values()])
                .filter(({ info }) => info === 'notaza-css')
                .map(({ content }) => content);
        },
        update(filename, content): DataProvider {
            return pageProvider(updateFiles(files, { filename, content }));
        },
    };
}
