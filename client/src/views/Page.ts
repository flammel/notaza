import _ from 'lodash';
import { Block as BT, Page as PT, PageId } from '../types';
import { WrappedElement } from '../html';
import { BlockRenderer } from '../Renderer';

abstract class BlockParent {
    public children: Block[] = [];
    public abstract onChange(): void;

    public prependChild(content: string): Block {
        const block = new Block({ content, children: [] }, this);
        this.children.splice(0, 0, block);
        this.onChange();
        return block;
    }

    public appendChild(content: string): Block {
        const block = new Block({ content, children: [] }, this);
        this.children.push(block);
        this.onChange();
        return block;
    }

    public insertChild(content: string, after?: Block): Block {
        const block = new Block({ content, children: [] }, this);
        if (after === undefined) {
            this.children.push(block);
        } else {
            const refIndex = this.children.indexOf(after);
            if (refIndex >= 0) {
                this.children.splice(refIndex + 1, 0, block);
            } else {
                this.children.push(block);
            }
        }
        this.onChange();
        return block;
    }

    public removeChild(child: Block): void {
        const index = this.children.indexOf(child);
        if (index >= 0) {
            this.children.splice(index, 1);
        }
        this.onChange();
    }
}

interface BlockElements {
    $block: HTMLLIElement;
    $inner: HTMLDivElement;
    $children: HTMLUListElement;
}
class Block extends BlockParent {
    private readonly parent: BlockParent | undefined;
    private content: string;
    private elements: BlockElements | undefined;

    constructor(bt: BT, parent: BlockParent | undefined) {
        super();
        this.content = bt.content;
        this.parent = parent;
        this.children = bt.children.map((child) => new Block(child, this));
    }

    public onChange(): void {
        this.parent?.onChange();
    }

    public setElements(elements: BlockElements): void {
        this.elements = elements;
    }

    public getElements(): BlockElements | undefined {
        return this.elements;
    }

    public setContent(content: string): void {
        this.content = content;
        this.onChange();
    }

    public getContent(): string {
        return this.content;
    }

    public getParent(): BlockParent | undefined {
        return this.parent;
    }

    public getPrev(): Block | undefined {
        const parent = this.parent;
        if (parent === undefined) {
            return undefined;
        }
        const index = parent.children.indexOf(this);
        if (index < 1) {
            return undefined;
        }
        return parent.children[index - 1];
    }

    public getNext(): Block | undefined {
        if (this.children.length > 0) {
            return this.children[0];
        }
        const parent = this.parent;
        if (parent === undefined) {
            return undefined;
        }
        const index = parent.children.indexOf(this);
        if (index < 1) {
            return undefined;
        }
        return parent.children[index - 1];
    }
}

export class Page extends BlockParent {
    public readonly title: string;
    private updatePending = false;

    constructor(private readonly pt: PT) {
        super();
        this.title = pt.title;
        this.children = pt.children.map((bt) => new Block(bt, this));
    }

    public onChange(): void {
        if (!this.updatePending) {
            this.updatePending = true;
            setTimeout(() => {
                this.updatePending = false;
                console.log(this.toPT());
            }, 0);
        }
    }

    private toPT(): PT {
        const blockMap = (block: Block): BT => ({
            content: block.getContent(),
            children: block.children.map(blockMap),
        });
        return {
            ...this.pt,
            children: this.children.map(blockMap),
        };
    }
}

function resize($textarea: HTMLTextAreaElement): void {
    $textarea.setAttribute('rows', '1');
    $textarea.style.height = 'auto';
    $textarea.style.height = $textarea.scrollHeight + 'px';
}

export interface BacklinkPage {
    id: PageId;
    title: string;
    backlinks: { content: string }[];
}

export class PageView implements WrappedElement {
    public readonly $element: HTMLElement;
    private readonly $title: HTMLHeadingElement;
    private readonly $blocks: HTMLUListElement;
    private readonly $backlinks: HTMLUListElement;
    private editing: [Block, HTMLTextAreaElement] | undefined;

    constructor(private readonly renderer: BlockRenderer) {
        this.$element = document.createElement('div');
        this.$element.classList.add('page');

        this.$title = document.createElement('h1');
        this.$element.appendChild(this.$title);

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
        this.$title.innerHTML = page.title;
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
                const $backlink = document.createElement('li');
                $backlink.innerHTML = this.renderer.render(backlinkBlock.content);
                $pageBacklinks.appendChild($backlink);
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

        block.setElements({ $block, $inner, $children });
        this.renderBlockContent(block);

        return $block;
    }

    private renderBlockContent(block: Block): HTMLDivElement {
        const elements = block.getElements();
        if (elements === undefined) {
            throw new Error('Tried to render content of unrendered block');
        }
        const $content = document.createElement('div');
        $content.classList.add('block__content');
        $content.innerHTML = this.renderer.render(block.getContent());
        $content.addEventListener('click', () => this.handleBlockClick(block));
        elements.$inner.innerHTML = '';
        elements.$inner.appendChild($content);
        return $content;
    }

    private renderBlockEditor(block: Block): HTMLTextAreaElement {
        const elements = block.getElements();
        if (elements === undefined) {
            throw new Error('Tried to render editor of unrendered block');
        }
        const $editor = document.createElement('textarea');
        $editor.classList.add('block__editor', 'editor');
        $editor.value = block.getContent();
        $editor.addEventListener('input', () => this.handleEditorInput($editor));
        $editor.addEventListener('keydown', (event) => this.handleEditorKeyDown(event, $editor));
        elements.$inner.innerHTML = '';
        elements.$inner.appendChild($editor);
        resize($editor);
        $editor.focus();
        $editor.setSelectionRange($editor.value.length, $editor.value.length);
        return $editor;
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
        const elements = editing.getElements();
        if (elements === undefined) {
            throw new Error('Tried to handle keydown in unrendered block');
        }
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const contentBefore = $textarea.value.substring(0, $textarea.selectionStart);
            const contentAfter = $textarea.value.substring($textarea.selectionEnd);
            editing.setContent(contentBefore);
            this.renderBlockContent(editing);
            if (editing.children.length === 0) {
                const parent = editing.getParent();
                if (parent === undefined) {
                    return;
                }
                const newBlock = parent.insertChild(contentAfter, editing);
                const $newBlock = this.renderBlock(newBlock);
                elements.$block.insertAdjacentElement('afterend', $newBlock);
                this.handleBlockClick(newBlock);
            } else {
                const newBlock = editing.prependChild(contentAfter);
                const $newBlock = this.renderBlock(newBlock);
                elements.$children.insertAdjacentElement('afterbegin', $newBlock);
                this.handleBlockClick(newBlock);
            }
        } else if (event.key === 'Tab') {
            event.preventDefault();
            if (event.shiftKey) {
                const parent = editing.getParent();
                if (parent instanceof Block) {
                    const grandParent = parent.getParent();
                    if (grandParent) {
                        parent.removeChild(editing);
                        const newBlock = grandParent.insertChild(editing.getContent(), parent);
                        const $newBlock = this.renderBlock(newBlock);
                        editing.getElements()?.$block.remove();
                        parent.getElements()?.$block.insertAdjacentElement('afterend', $newBlock);
                        this.handleBlockClick(newBlock);
                    }
                }
            } else {
                const prev = editing.getPrev();
                if (prev) {
                    editing.getParent()?.removeChild(editing);
                    editing.getElements()?.$block.remove();
                    const newBlock = prev.appendChild(editing.getContent());
                    const $newBlock = this.renderBlock(newBlock);
                    prev.getElements()?.$children.appendChild($newBlock);
                    this.handleBlockClick(newBlock);
                }
            }
        } else if (event.key === 'Backspace' && $textarea.value.length === 0) {
            event.preventDefault();
            const parent = editing.getParent();
            if (parent === undefined) {
                return;
            }
            parent.removeChild(editing);
            editing.getElements()?.$block.remove();
            this.editing = undefined;
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
            if (prev !== undefined) {
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
