import Token from 'markdown-it/lib/token';
import { ApiFiles } from '../api';
import { notazamd } from '../markdown';
import { Card, Page, FrontMatter, Style } from '../model';
import { memoize, withoutExtension, partial } from '../util';
import { DataProvider } from './types';
import { pageAliases, containsReference, getFences, updateFiles } from './util';

interface Block {
    tokens: Token[];
}

function getBlocks(page: Page): Block[] {
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
}

const memoizedGetBlocks = memoize(getBlocks);

function getFilteredContent(page: Page, filter: (md: string) => boolean): string {
    const blocks = memoizedGetBlocks(page).filter((block) => block.tokens.some((token) => filter(token.content)));
    return `<ul>${blocks.map((b) => '<li>' + notazamd().renderTokens(b.tokens) + '</li>').join('')}</ul>`;
}

function toCard(filter: (md: string) => boolean, page: Page): Card {
    return {
        type: 'page',
        url: page.filename,
        title: page.title,
        tags: [],
        content: [getFilteredContent(page, filter)],
    };
}

function searchFilter(query: string, page: Page): boolean {
    return page.title.toLowerCase().includes(query) || page.body.toLowerCase().includes(query);
}

function relatedFilter(page: Page, other: Page): boolean {
    return other.filename !== page.filename && containsReference(other.body, page);
}

function relatedMdFilter(page: Page, md: string): boolean {
    return containsReference(md, page);
}

function searchMdFilter(query: string, md: string): boolean {
    return md.toLocaleLowerCase().includes(query);
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
        pages(): Page[] {
            return [...pages.values()];
        },
        page(filename): Page | undefined {
            return pages.get(filename) ?? aliases.get(withoutExtension(filename));
        },
        related(page): Card[] {
            return [...pages.values()]
                .filter(partial(relatedFilter, page))
                .map(partial(toCard, partial(relatedMdFilter, page)));
        },
        search(query): Card[] {
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
