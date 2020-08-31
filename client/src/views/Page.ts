import { Page, Block, PageId } from '../types';
import { BlockRenderer } from '../service/BlockRenderer';
import { notUndefined, dateToString } from '../util';
import { Api } from '../service/Api';

interface PageWithBacklinks {
    page: Page;
    backlinks: Block[];
}

function blockContainsLinkTo(block: Block, activePage: Page): boolean {
    return (
        block.content.includes('](./' + activePage.id + '.md)') ||
        block.content.includes('](./' + activePage.id + ')') ||
        block.content.includes('#' + activePage.id) ||
        block.content.includes('[[' + activePage.title + ']]')
    );
}

function blockBacklinks(block: Block, activePage: Page): Block | undefined {
    const direct = block.children.find(
        (child) => blockContainsLinkTo(child, activePage) && child.children.length === 0,
    );
    if (direct !== undefined || blockContainsLinkTo(block, activePage)) {
        return block;
    }
    const childrenWithBacklinks = block.children.map((child) => blockBacklinks(child, activePage)).filter(notUndefined);
    if (blockContainsLinkTo(block, activePage) || childrenWithBacklinks.length > 0) {
        return { ...block, children: childrenWithBacklinks };
    }
}

function pageBacklinks(page: Page, activePage: Page): PageWithBacklinks | undefined {
    if (page.id !== activePage.id) {
        const backlinks: Block[] = page.children.map((block) => blockBacklinks(block, activePage)).filter(notUndefined);
        if (backlinks.length > 0) {
            return {
                page,
                backlinks,
            };
        }
    }
}

export class PageView {
    private readonly $page: HTMLElement;
    private readonly renderBlock: (block: Block) => string;
    private readonly savePage: (id: PageId, rawMarkdown: string) => void;

    private pages: Page[] = [];
    private url: string = '';
    private editing: boolean = false;

    public constructor(
        $container: HTMLElement,
        renderBlock: (block: Block) => string,
        savePage: (id: PageId, rawMarkdown: string) => void,
    ) {
        const $page = document.createElement('div');
        $page.classList.add('page');

        $container.appendChild($page);

        this.$page = $page;

        this.renderBlock = renderBlock;
        this.savePage = savePage;
    }

    public setPages(pages: Page[]): void {
        this.pages = pages;
        this.editing = false;
        this.update();
    }

    public setUrl(url: string): void {
        this.url = url;
        this.editing = false;
        this.update();
    }

    private update(): void {
        const url = this.url === '' ? dateToString(new Date()) : this.url;
        const page = this.pages.find((page) => page.id === url);
        if (page !== undefined) {
            this.renderPage(page);
        } else {
            this.renderPage({
                id: url,
                title: url,
                children: [],
                rawMarkdown: ['---', 'title: ' + url, '---', ''].join('\n'),
            });
        }
    }

    private renderPage(page: Page): void {
        const $header = this.renderHeader(page);
        const $body = this.renderBody(page);
        const $backlinks = this.renderBacklinks(page);

        this.$page.innerHTML = '';
        this.$page.appendChild($header);
        this.$page.appendChild($body);
        this.$page.appendChild($backlinks);
        this.autoResizeEditor();
    }

    private renderHeader(page: Page): HTMLElement {
        const $header = document.createElement('div');
        $header.classList.add('page__header');

        const $title = document.createElement('h1');
        $title.innerText = page.title;

        const $editButton = document.createElement('button');
        $editButton.innerText = 'edit';
        $editButton.addEventListener('click', () => {
            this.editing = true;
            this.update();
        });

        $header.appendChild($title);
        $header.appendChild($editButton);
        return $header;
    }

    private renderBody(page: Page): HTMLElement {
        const $body = document.createElement('div');

        if (this.editing) {
            const $editor = document.createElement('textarea');
            $editor.classList.add('editor');
            $editor.innerHTML = page.rawMarkdown;

            const $save = document.createElement('button');
            $save.innerText = 'Save';
            $save.addEventListener('click', () => {
                this.savePage(page.id, $editor.value);
            });

            const $cancel = document.createElement('button');
            $cancel.innerText = 'Cancel';
            $cancel.addEventListener('click', () => {
                this.editing = false;
                this.update();
            });

            $body.appendChild($editor);
            $body.appendChild($save);
            $body.appendChild($cancel);
        } else {
            const $blocks = document.createElement('ul');
            $blocks.classList.add('blocks');
            for (const block of page.children) {
                $blocks.appendChild(this.createBlockElement(block));
            }
            $body.appendChild($blocks);
        }

        return $body;
    }

    private renderBacklinks(page: Page): HTMLElement {
        const $backlinks = document.createElement('div');

        const $headline = document.createElement('h2');
        $headline.innerText = 'Backlinks';
        $backlinks.appendChild($headline);

        const backlinkPages = this.pages
            .map((otherPage) => pageBacklinks(otherPage, page))
            .filter(notUndefined)
            .flat();
        for (const backlinkPage of backlinkPages) {
            const $pageTitle = document.createElement('h3');
            const $pageTitleLink = document.createElement('a');
            $pageTitleLink.setAttribute('href', '/' + backlinkPage.page.id);
            $pageTitleLink.innerText = backlinkPage.page.title;
            $pageTitle.appendChild($pageTitleLink);
            const $backlinkBlocks = document.createElement('ul');
            for (const backlinkBlock of backlinkPage.backlinks) {
                $backlinkBlocks.appendChild(this.createBlockElement(backlinkBlock));
            }
            $backlinks.appendChild($pageTitle);
            $backlinks.appendChild($backlinkBlocks);
        }

        return $backlinks;
    }

    private createBlockElement(block: Block): HTMLLIElement {
        const $block = document.createElement('li');
        $block.classList.add('block');

        const $inner = document.createElement('div');
        $inner.classList.add('block__inner');
        $inner.innerHTML = this.renderBlock(block);

        const $children = document.createElement('ul');
        $children.classList.add('block__children', 'blocks');
        for (const child of block.children) {
            $children.appendChild(this.createBlockElement(child));
        }

        $block.appendChild($inner);
        $block.appendChild($children);

        return $block;
    }

    private autoResizeEditor(): void {
        const $editor = this.$page.querySelector('textarea.editor');
        if ($editor instanceof HTMLTextAreaElement) {
            $editor.setAttribute('rows', '1');
            $editor.style.height = 'auto';
            $editor.style.height = ($editor.scrollHeight + 10).toString() + 'px';
        }
    }
}
