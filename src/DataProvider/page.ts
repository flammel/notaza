import Token from 'markdown-it/lib/token';
import { ApiFiles } from '../api';
import { notazamd } from '../markdown';
import { Style, Card, SearchResult } from '../model';
import { memoize, withoutExtension, curry } from '../util';
import { DataProvider, IndexEntry, MarkdownRenderer } from './types';
import { getFences, updateFiles, getReferences, disjoint, cardNames } from './util';

type FrontMatter = Record<string, string | undefined>;

interface Page {
    readonly filename: string;
    readonly id: string;
    readonly title: string;
    readonly frontMatter: FrontMatter;
    readonly body: string;
    readonly raw: string;
}
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

function toFilteredCard(blockFilter: BlockFilter, page: Page): Card {
    const blocks = getBlocks(page).filter(blockFilter);
    return {
        type: 'page',
        filename: page.filename,
        url: page.filename,
        title: page.title,
        tags: [],
        content: [`<ul>${blocks.map((b) => '<li>' + notazamd().renderTokens(b.tokens) + '</li>').join('')}</ul>`],
    };
}
function toCard(mdRenderer: MarkdownRenderer, page: Page): Card {
    return {
        type: 'page',
        filename: page.filename,
        url: page.filename,
        title: page.title,
        tags: [],
        content: [mdRenderer(page.body)],
    };
}

function searchFilter(query: string, page: Page): boolean {
    return page.title.toLowerCase().includes(query) || page.body.toLowerCase().includes(query);
}

function relatedFilter(card: Card, other: Page): boolean {
    return other.filename !== card.filename && !disjoint(cardNames(card), getReferences(other.body));
}

function relatedMdFilter(card: Card, block: Block): boolean {
    return !disjoint(cardNames(card), getReferences(block.tokens));
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

export function pageProvider(files: ApiFiles, mdRenderer: MarkdownRenderer): DataProvider {
    const pages = files
        .filter(({ filename, content }) => filename.endsWith('.md') && !content.startsWith('``` '))
        .map(({ filename, content }) => makePage(filename, content));
    return {
        indexEntries(): IndexEntry[] {
            return pages.map((page) => ({
                url: page.filename,
                title: page.title,
            }));
        },
        card(filename): Card | undefined {
            const page = pages.find((page) => page.filename === filename);
            return page ? toCard(mdRenderer, page) : undefined;
        },
        related(card): Card[] {
            return pages.filter(curry(relatedFilter)(card)).map(curry(toFilteredCard)(curry(relatedMdFilter)(card)));
        },
        search(query): SearchResult[] {
            return pages
                .filter(curry(searchFilter)(query.toLowerCase()))
                .map(curry(toFilteredCard)(curry(searchMdFilter)(query)));
        },
        styles(): Style[] {
            return getFences([...files.values()])
                .filter(({ info }) => info === 'notaza-css')
                .map(({ content }) => content);
        },
        update(filename, content): DataProvider {
            return pageProvider(updateFiles(files, { filename, content }), mdRenderer);
        },
    };
}
