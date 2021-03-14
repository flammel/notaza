import { ApiFiles } from './api';
import { Token, notazamd, getReferences, getFences } from './markdown';
import { Card, IndexEntry, SearchResult, Store } from './types';
import { notUndefined, withoutExtension, disjoint, urlize, titleize } from './util';

type FrontMatter = Record<string, string | undefined>;

interface Block {
    tokens: Token[];
}

interface Page {
    readonly filename: string;
    readonly id: string;
    readonly title: string;
    readonly frontMatter: FrontMatter;
    readonly body: string;
    readonly raw: string;
    readonly blocks: Block[];
}

export type MarkdownRenderer = (md: string) => string;

export function makeStore(files: ApiFiles, mdRenderer: MarkdownRenderer): Store {
    const pages = new Map(
        files
            .filter(({ filename }) => filename.endsWith('.md'))
            .map(({ filename, content }) => [filename, makePage(filename, content, notazamd().parse)]),
    );

    return {
        index(): IndexEntry[] {
            return [...pages.values()].map((page) => ({
                url: page.filename,
                title: page.title,
            }));
        },
        card(filename: string): Card | undefined {
            const page = pages.get(filename);
            return page ? toCard(mdRenderer, page) : undefined;
        },
        related(card: Card): Card[] {
            return [...pages.values()].map((page) => makeRelated(page, card)).filter(notUndefined);
        },
        search(query: string): SearchResult[] {
            if (query.length < 3) {
                return [];
            }
            query = query.toLocaleLowerCase();
            return [...pages.values()]
                .map((page) => makeSearchResult(page, query))
                .filter(notUndefined)
                .sort(searchResultSort(query));
        },
        styles(): string[] {
            return [...pages.values()]
                .flatMap((page) => getFences(page.body))
                .filter((fence) => fence.info === 'notaza-styles')
                .map((fence) => fence.content);
        },
        update(filename: string, content: string): void {
            pages.set(filename, makePage(filename, content, notazamd().parse));
        },
        rawContent(filename: string): string {
            return pages.get(filename)?.raw ?? `---\ntitle: ${titleize(filename.slice(0, -3))}\n---\n`;
        },
    };
}

function pageMatchesQuery(page: Page, query: string): boolean {
    return page.title.toLowerCase().includes(query) || page.body.toLowerCase().includes(query);
}

function blockMatchesQuery(block: Block, query: string): boolean {
    return block.tokens.some((token) => token.content.toLocaleLowerCase().includes(query));
}

function makeSearchResult(page: Page, query: string): Card | undefined {
    if (pageMatchesQuery(page, query)) {
        return {
            filename: page.filename,
            title: page.title,
            content: blocksToList(page.blocks.filter((block) => blockMatchesQuery(block, query))),
        };
    }
}

function pageContainsReference(page: Page, target: Card): boolean {
    return page.filename !== target.filename && !disjoint(cardNames(target), getReferences(page.body));
}

function blockContainsReference(block: Block, target: Card): boolean {
    return !disjoint(cardNames(target), getReferences(block.tokens));
}

function makeRelated(page: Page, card: Card): Card | undefined {
    if (pageContainsReference(page, card)) {
        return {
            filename: page.filename,
            title: page.title,
            content: blocksToList(page.blocks.filter((block) => blockContainsReference(block, card))),
        };
    }
}

function blocksToList(blocks: Block[]): string {
    return `<ul>${blocks.map((b) => '<li>' + notazamd().renderTokens(b.tokens) + '</li>').join('')}</ul>`;
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

function getBlocks(tokens: Token[]): Block[] {
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
}

function makePage(filename: string, content: string, parser: (str: string) => Token[]): Page {
    const { frontMatter, body } = bodyAndFrontMatter(content);
    return {
        filename,
        id: withoutExtension(filename),
        frontMatter,
        body,
        title: frontMatter.title || filename,
        raw: content,
        blocks: getBlocks(parser(body)),
    };
}

function toCard(mdRenderer: MarkdownRenderer, page: Page): Card {
    return {
        filename: page.filename,
        title: page.title,
        content: mdRenderer(page.body),
    };
}

function searchResultSort(query: string): (a: SearchResult, b: SearchResult) => number {
    return (a: SearchResult, b: SearchResult): number => {
        const aIdx = a.title.toLowerCase().indexOf(query.toLowerCase());
        const bIdx = b.title.toLowerCase().indexOf(query.toLowerCase());
        return (aIdx < 0 ? 4096 : aIdx) - (bIdx < 0 ? 4096 : bIdx);
    };
}

export function getOrMakeCard(store: Store, filename: string): Card {
    if (filename === '_index.md') {
        return makeIndexCard(store.index());
    }
    if (filename === '') {
        filename = 'index.md';
    }
    return store.card(filename) ?? makeCardFromFilename(filename);
}

function makeCardFromFilename(filename: string): Card {
    return {
        filename,
        title: withoutExtension(filename),
        content: '',
    };
}

function makeIndexCard(entries: IndexEntry[]): Card {
    return {
        filename: '_index.md',
        title: 'Index',
        content: [
            '<ul>',
            ...entries
                .sort((a, b) => a.title.localeCompare(b.title))
                .map((entry) => `<li><a class="internal" href="/#/${entry.url}">${entry.title}</a></li>`),
            '</ul>',
        ].join(''),
    };
}

function cardNames(card: Card): Set<string> {
    return new Set([withoutExtension(card.filename), card.title, urlize(card.title)]);
}
