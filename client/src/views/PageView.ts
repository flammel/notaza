import { BlockRenderer } from '../BlockRenderer';
import { Page, Block, PageId } from '../Page';
import { PageRepository } from '../PageRepository';

function resize($textarea: HTMLTextAreaElement): void {
    $textarea.setAttribute('rows', '1');
    $textarea.style.height = 'auto';
    $textarea.style.height = $textarea.scrollHeight + 'px';
}

interface BlockElements {
    $block: HTMLLIElement;
    $inner: HTMLDivElement;
    $children: HTMLUListElement;
}

export interface BacklinkPage {
    id: PageId;
    title: string;
    backlinks: Block[];
}

class Autocomplete {
    public readonly $root: HTMLElement;
    private isOpen = false;

    public constructor(private readonly pages: Page[], $textarea: HTMLTextAreaElement) {
        this.$root = document.createElement('ul');
        this.$root.classList.add('autocomplete');

        $textarea.addEventListener('keyup', (event) => {
            if (this.isOpen) {
                const beforeSel = $textarea.value.substring(0, $textarea.selectionStart).match(/#([\w-]+)$/);
                if (beforeSel !== null) {
                    this.open(beforeSel[1]);
                } else {
                    this.close();
                }
            } else if (event.key === '#') {
                this.open('');
            }
        });
    }

    private close(): void {
        this.$root.innerHTML = '';
        this.isOpen = false;
    }

    private open(filter: string): void {
        this.isOpen = true;
        this.$root.innerHTML = '';
        for (const page of this.pages) {
            if (
                page.getTitle().toLowerCase().includes(filter.toLowerCase()) ||
                page.id.toLowerCase().includes(filter.toLowerCase())
            ) {
                const $item = document.createElement('li');
                $item.innerText = page.getTitle();
                this.$root.appendChild($item);
            }
        }
    }
}

export class PageView {
    public readonly $element: HTMLElement;
    private readonly $title: HTMLHeadingElement;
    private readonly $blocks: HTMLUListElement;
    private readonly $backlinks: HTMLUListElement;
    private editing: [Block, HTMLTextAreaElement] | undefined;
    private blockElements = new Map<Block, BlockElements>();
    private page: Page | undefined;

    constructor(private readonly renderer: BlockRenderer, private readonly pageRepository: PageRepository) {
        this.$element = document.createElement('div');
        this.$element.classList.add('page');

        this.$title = document.createElement('h1');
        this.$element.appendChild(this.$title);
        this.$title.addEventListener('click', () => {
            if (this.$title.getElementsByTagName('input').length > 0) {
                return;
            }
            const $editor = document.createElement('input');
            $editor.classList.add('title-editor');
            $editor.value = this.$title.innerText;
            $editor.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || (event.key === 's' && event.ctrlKey)) {
                    event.preventDefault();
                    this.page?.setTitle($editor.value);
                    this.$title.innerText = $editor.value;
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    this.$title.innerText = this.page?.getTitle() || '';
                }
            });
            this.$title.innerHTML = '';
            this.$title.appendChild($editor);
            $editor.focus();
        });

        this.$blocks = document.createElement('ul');
        this.$blocks.classList.add('blocks');
        this.$element.appendChild(this.$blocks);

        const $backlinksHeadline = document.createElement('h2');
        $backlinksHeadline.innerText = 'Backlinks';
        this.$element.appendChild($backlinksHeadline);

        this.$backlinks = document.createElement('ul');
        this.$blocks.classList.add('backlinks');
        this.$element.appendChild(this.$backlinks);
    }

    public setPage(page: Page, backlinkPages: BacklinkPage[]): void {
        this.page = page;
        this.$title.innerHTML = page.getTitle();
        const $children = this.renderBlocks(page.children);
        this.$blocks.innerHTML = '';
        this.$blocks.appendChild($children);
        const $backlinks = this.renderBacklinks(backlinkPages);
        this.$backlinks.innerHTML = '';
        this.$backlinks.appendChild($backlinks);
    }

    private renderBacklinks(backlinkPages: BacklinkPage[]): DocumentFragment {
        const $backlinks = document.createDocumentFragment();
        for (const backlinkPage of backlinkPages) {
            const $pageLink = document.createElement('a');
            $pageLink.classList.add('internal');
            $pageLink.setAttribute('href', './' + backlinkPage.id);
            $pageLink.innerText = backlinkPage.title;

            const $pageBacklinks = document.createElement('ul');
            for (const backlinkBlock of backlinkPage.backlinks) {
                $pageBacklinks.appendChild(this.renderBlock(backlinkBlock));
            }

            const $li = document.createElement('li');
            $li.appendChild($pageLink);
            $li.appendChild($pageBacklinks);
            $backlinks.appendChild($li);
        }
        return $backlinks;
    }

    private renderBlocks(blocks: Block[]): DocumentFragment {
        const $blocks = document.createDocumentFragment();
        for (const block of blocks) {
            $blocks.appendChild(this.renderBlock(block));
        }
        return $blocks;
    }

    private renderBlock(block: Block): HTMLLIElement {
        const $block = document.createElement('li');
        $block.classList.add('block');

        const $inner = document.createElement('div');
        $inner.classList.add('block__inner');
        $block.appendChild($inner);

        const $children = document.createElement('ul');
        $children.classList.add('block__children', 'blocks');
        $children.appendChild(this.renderBlocks(block.children));
        $block.appendChild($children);

        this.blockElements.set(block, { $block, $inner, $children });
        this.renderBlockContent(block);

        return $block;
    }

    private renderBlockContent(block: Block): void {
        const elements = this.blockElements.get(block);
        if (elements === undefined) {
            throw new Error('Tried to render content of unrendered block');
        }
        const $content = document.createElement('div');
        $content.classList.add('block__content');
        $content.innerHTML = this.renderer.render(block.getContent());
        $content.addEventListener('click', (event) => {
            if (event.target instanceof HTMLInputElement) {
                block.toggleDone();
                $content.innerHTML = this.renderer.render(block.getContent());
            } else {
                this.handleBlockClick(block);
            }
        });
        elements.$inner.innerHTML = '';
        elements.$inner.appendChild($content);
    }

    private renderBlockEditor(block: Block): HTMLTextAreaElement {
        const elements = this.blockElements.get(block);
        if (elements === undefined) {
            throw new Error('Tried to render editor of unrendered block');
        }

        const $textarea = document.createElement('textarea');
        const autocomplete = new Autocomplete(this.pageRepository.getAllPages(), $textarea);
        $textarea.classList.add('block__editor', 'editor');
        $textarea.value = block.getContent();
        $textarea.addEventListener('input', () => this.handleEditorInput($textarea));
        $textarea.addEventListener('keydown', (event) => this.handleEditorKeyDown(event, $textarea));
        elements.$inner.innerHTML = '';
        elements.$inner.appendChild($textarea);
        resize($textarea);
        $textarea.focus();
        $textarea.setSelectionRange($textarea.value.length, $textarea.value.length);

        elements.$inner.appendChild(autocomplete.$root);

        return $textarea;
    }

    public handleBlockClick(block: Block): void {
        if (this.editing !== undefined) {
            this.editing[0].setContent(this.editing[1].value);
            this.renderBlockContent(this.editing[0]);
        }
        this.editing = [block, this.renderBlockEditor(block)];
    }

    public handleEditorInput($textarea: HTMLTextAreaElement): void {
        resize($textarea);
    }

    public handleEditorKeyDown(event: KeyboardEvent, $textarea: HTMLTextAreaElement): void {
        const editing = this.editing ? this.editing[0] : undefined;
        if (editing === undefined) {
            return;
        }
        const elements = this.blockElements.get(editing);
        if (elements === undefined) {
            throw new Error('Tried to handle keydown in unrendered block');
        }
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const contentBefore = $textarea.value.substring(0, $textarea.selectionStart);
            const contentAfter = $textarea.value.substring($textarea.selectionEnd);
            editing.setContent(contentBefore);
            $textarea.value = contentBefore;
            this.renderBlockContent(editing);
            if (editing.children.length === 0) {
                const parent = editing.getParent();
                if (parent === undefined) {
                    return;
                }
                const newBlock = parent.insertChild(contentAfter, editing);
                const $newBlock = this.renderBlock(newBlock);
                elements.$block.insertAdjacentElement('afterend', $newBlock);
                this.handleBlockClick(contentBefore.length === 0 && contentAfter.length !== 0 ? editing : newBlock);
            } else {
                const newBlock = editing.prependChild(contentAfter);
                const $newBlock = this.renderBlock(newBlock);
                elements.$children.insertAdjacentElement('afterbegin', $newBlock);
                this.handleBlockClick(contentBefore.length === 0 && contentAfter.length !== 0 ? editing : newBlock);
            }
        } else if (event.key === 'Tab') {
            editing.setContent($textarea.value);
            event.preventDefault();
            if (event.shiftKey) {
                const parent = editing.getParent();
                if (parent instanceof Block) {
                    const grandParent = parent.getParent();
                    if (grandParent) {
                        parent.removeChild(editing);
                        const newBlock = grandParent.insertChild(editing.getContent(), parent);
                        const $newBlock = this.renderBlock(newBlock);
                        elements.$block.remove();
                        this.blockElements.get(parent)?.$block.insertAdjacentElement('afterend', $newBlock);
                        this.handleBlockClick(newBlock);
                    }
                }
            } else {
                const prev = editing.getPrev();
                if (prev) {
                    editing.getParent()?.removeChild(editing);
                    elements.$block.remove();
                    const newBlock = prev.appendChild(editing.getContent());
                    const $newBlock = this.renderBlock(newBlock);
                    this.blockElements.get(prev)?.$children.appendChild($newBlock);
                    this.handleBlockClick(newBlock);
                }
            }
        } else if (event.key === 'Backspace' && $textarea.value.length === 0) {
            event.preventDefault();
            const prev = editing.getPrev();
            const parent = editing.getParent();
            if (parent === undefined || (prev === undefined && parent instanceof Page)) {
                return;
            }
            parent.removeChild(editing);
            elements.$block.remove();
            if (prev) {
                this.editing = [prev, this.renderBlockEditor(prev)];
            }
        } else if (event.key === 's' && event.ctrlKey) {
            event.preventDefault();
            editing.setContent($textarea.value);
            this.renderBlockContent(editing);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            editing.setContent($textarea.value);
            this.renderBlockContent(editing);
        } else if (event.key === 'ArrowUp' && event.ctrlKey) {
            event.preventDefault();
            const prev = editing.getPrev();
            if (prev == undefined) {
                const parent = editing.getParent();
                if (parent instanceof Block) {
                    this.handleBlockClick(parent);
                }
            } else {
                this.handleBlockClick(prev);
            }
        } else if (event.key === 'ArrowDown' && event.ctrlKey) {
            event.preventDefault();
            const next = editing.getNext();
            if (next !== undefined) {
                this.handleBlockClick(next);
            }
        }
    }
}
