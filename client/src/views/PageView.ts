import { BlockRenderer } from '../BlockRenderer';
import { PageWithBacklinks, Block, Page } from '../Page';

class Editor {
    public readonly $root: HTMLElement;
    private readonly $textarea: HTMLTextAreaElement;

    private editing: BlockView | undefined;

    constructor() {
        this.$textarea = document.createElement('textarea');
        this.$textarea.classList.add('block__editor', 'editor');
        this.$textarea.addEventListener('input', () => this.resize());
        this.$textarea.addEventListener('keydown', (event) => this.handleKeyDown(event));
        this.$root = this.$textarea;
    }

    private stop(): void {
        if (this.editing !== undefined) {
            this.editing.setContent(this.$textarea.value);
            this.editing.renderContent();
        }
        this.editing = undefined;
    }

    public start(view: BlockView): void {
        this.stop();
        this.$textarea.focus();
        this.$textarea.setSelectionRange(this.$textarea.value.length, this.$textarea.value.length);
        this.$textarea.value = view.getContent();
        view.$inner.innerHTML = '';
        view.$inner.appendChild(this.$textarea);
        this.$textarea.focus();
        this.$textarea.setSelectionRange(this.$textarea.value.length, this.$textarea.value.length);
        this.editing = view;
        this.resize();
    }

    private handleKeyDown(event: KeyboardEvent): void {
        const editing = this.editing;
        if (editing) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                const contentBefore = this.$textarea.value.substring(0, this.$textarea.selectionStart);
                const contentAfter = this.$textarea.value.substring(this.$textarea.selectionEnd);
                this.$textarea.value = contentBefore;
                this.stop();
                this.start(editing.createSuccessor(contentAfter));
            } else if (event.key === 'Tab') {
                event.preventDefault();
                if (event.shiftKey) {
                    editing.unindent();
                } else {
                    editing.indent();
                }
            } else if (event.key === 'Backspace' && this.$textarea.value.length === 0) {
                event.preventDefault();
                this.stop();
                editing.remove();
                this.editing = undefined;
            } else if (event.key === 's' && event.ctrlKey) {
                event.preventDefault();
                this.stop();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                this.stop();
            }
        }
    }

    private resize(): void {
        this.$textarea.setAttribute('rows', '1');
        this.$textarea.style.height = 'auto';
        this.$textarea.style.height = this.$textarea.scrollHeight + 'px';
    }
}

class BlockView {
    public readonly $root: HTMLLIElement;
    public readonly $inner: HTMLDivElement;
    public readonly $children: HTMLUListElement;

    constructor(
        private readonly renderer: BlockRenderer,
        private readonly editor: Editor,
        public readonly block: Block,
    ) {
        this.$root = document.createElement('li');
        this.$root.classList.add('block');

        this.$inner = document.createElement('div');
        this.$inner.classList.add('block__inner');
        this.$root.appendChild(this.$inner);

        this.$children = document.createElement('ul');
        this.$children.classList.add('block__children', 'blocks');
        this.$root.appendChild(this.$children);

        this.renderContent();
    }

    public renderContent(): void {
        const $content = document.createElement('div');
        $content.classList.add('block__content');
        $content.innerHTML = this.renderer.render(this.block.getContent());
        $content.addEventListener('click', () => this.editor.start(this));
        this.$inner.innerHTML = '';
        this.$inner.appendChild($content);
    }

    public setContent(content: string): void {
        this.block.setContent(content);
    }

    public getContent(): string {
        return this.block.getContent();
    }

    public createSuccessor(content: string): BlockView {
        if (this.block.children.length > 0) {
            const newBlock = this.block.prependChild(content);
            const newView = new BlockView(this.renderer, this.editor, newBlock);
            this.$children.prepend(newView.$root);
            return newView;
        } else {
            const newBlock = this.block.getParent().insertChild(content, this.block);
            const newView = new BlockView(this.renderer, this.editor, newBlock);
            this.$root.insertAdjacentElement('afterend', newView.$root);
            return newView;
        }
    }

    public remove(): void {
        this.block.getParent().removeChild(this.block);
        this.$root.remove();
    }

    public indent(): void {
        
    }

    public unindent(): void {
        
    }
}

class BlocksView {
    public readonly $root: HTMLUListElement;
    private readonly views = new Map<Block, BlockView>();

    constructor(
        private readonly renderer: BlockRenderer,
        private readonly editor: Editor,
        private readonly page: Page,
    ) {
        this.page = page;
        this.$root = document.createElement('ul');
        this.$root.classList.add('blocks');
        this.renderBlocks(this.$root, page.children);
    }

    private renderBlocks($into: HTMLUListElement, blocks: Block[]): void {
        for (const block of blocks) {
            const view = new BlockView(this.renderer, this.editor, block);
            this.views.set(block, view);
            $into.appendChild(view.$root);
            this.renderBlocks(view.$children, block.children);
        }
    }
}

class TitleView {
    public readonly $root: HTMLHeadingElement;

    constructor(private readonly page: Page) {
        this.$root = document.createElement('h1');
        this.$root.innerText = page.getTitle();
        this.$root.addEventListener('click', () => this.startEditing());
    }

    private startEditing(): void {
        if (this.$root.getElementsByTagName('input').length > 0) {
            return;
        }
        const $editor = document.createElement('input');
        $editor.classList.add('title-editor');
        $editor.value = this.$root.innerText;
        $editor.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || (event.key === 's' && event.ctrlKey)) {
                event.preventDefault();
                this.page.setTitle($editor.value);
                this.$root.innerText = $editor.value;
            } else if (event.key === 'Escape') {
                event.preventDefault();
                this.$root.innerText = this.page.getTitle() || '';
            }
        });
        this.$root.innerHTML = '';
        this.$root.appendChild($editor);
        $editor.focus();
    }
}

class BacklinksView {
    public readonly $root: HTMLDivElement;

    constructor(renderer: BlockRenderer, page: PageWithBacklinks) {
        this.$root = document.createElement('div');

        const $headline = document.createElement('h2');
        $headline.innerText = 'Backlinks';
        this.$root.classList.add('blocks');

        const $backlinks = document.createElement('ul');
        $backlinks.classList.add('backlinks');
        for (const group of page.backlinks) {
            const $pageLink = document.createElement('a');
            $pageLink.classList.add('internal');
            $pageLink.setAttribute('href', './' + group.page.id);
            $pageLink.innerText = group.page.getTitle();

            const $pageBacklinks = document.createElement('ul');
            for (const backlinkBlock of group.backlinks) {
                const $backlink = document.createElement('li');
                $backlink.innerHTML = renderer.render(backlinkBlock.getContent());
                $pageBacklinks.appendChild($backlink);
            }

            const $li = document.createElement('li');
            $li.appendChild($pageLink);
            $li.appendChild($pageBacklinks);
            $backlinks.appendChild($li);
        }
        this.$root.appendChild($backlinks);
    }
}

export class PageView {
    public readonly $root: HTMLElement;

    constructor(renderer: BlockRenderer, page: PageWithBacklinks) {
        const editor = new Editor();
        this.$root = document.createElement('div');
        this.$root.classList.add('page');

        const titleView = new TitleView(page.page);
        this.$root.appendChild(titleView.$root);

        const blocksView = new BlocksView(renderer, editor, page.page);
        this.$root.appendChild(blocksView.$root);

        const backlinksView = new BacklinksView(renderer, page);
        this.$root.appendChild(backlinksView.$root);
    }
}


// interface BlockViewParent {
//     insertChild(content: string, after: BlockView | undefined): BlockView;
//     getChildBefore(child: BlockView): BlockView | undefined;
//     removeChild(child: BlockView): void;
// }

// class BlockView implements BlockViewParent {
//     public readonly $root: HTMLLIElement;
//     private readonly $inner: HTMLDivElement;
//     private readonly $children: HTMLUListElement;
//     private readonly children: BlockView[] = [];

//     constructor(
//         private readonly parent: BlockView | BlocksView,
//         public readonly block: Block,
//         private readonly renderer: BlockRenderer,
//         private readonly editor: Editor,
//     ) {
//         this.$root = document.createElement('li');
//         this.$root.classList.add('block');

//         this.$inner = document.createElement('div');
//         this.$inner.classList.add('block__inner');
//         this.$root.appendChild(this.$inner);

//         this.$children = document.createElement('ul');
//         this.$children.classList.add('block__children', 'blocks');
//         for (const child of block.children) {
//             const view = new BlockView(this, child, renderer, editor);
//             this.children.push(view);
//             this.$children.appendChild(view.$root);
//         }
//         this.$root.appendChild(this.$children);

//         this.renderContent();
//     }

//     public getContent(): string {
//         return this.block.getContent();
//     }

//     public stopEditing(): void {
//         this.block.setContent(this.editor.getContent());
//         this.renderContent();
//     }

//     public startEditing(): void {
//         this.$inner.innerHTML = '';
//         this.$inner.appendChild(this.editor.$root);
//         this.editor.start(this);
//     }

//     public insertBelow(contentAfter: string): BlockView | undefined {
//         if (this.children.length === 0) {
//             if (this.parent !== undefined) {
//                 return this.parent.insertChild(contentAfter, this);
//             }
//         } else {
//             return this.insertChild(contentAfter, undefined);
//         }
//     }

//     public indent(): void {
//         if (this.parent) {
//             const before = this.parent.getChildBefore(this);
//             if (before) {
//                 this.parent.removeChild(this);
//                 before.appendChild(this);
//             }
//         }
//     }

//     public unindent(): void {
//         if (this.parent instanceof BlockView) {
//             if (this.parent.parent) {
//                 this.parent.removeChild(this);
//                 this.parent.parent.insertChild(this.getContent(), this.parent);
//             }
//         }
//     }

//     public remove(): void {
//         this.parent?.removeChild(this);
//     }

//     private renderContent(): void {
//         const $content = document.createElement('div');
//         $content.classList.add('block__content');
//         $content.innerHTML = this.renderer.render(this.block.getContent());
//         $content.addEventListener('click', () => this.startEditing());
//         this.$inner.innerHTML = '';
//         this.$inner.appendChild($content);
//     }

//     public appendChild(child: BlockView): void {
//         this.children.push(child);
//         this.$children.appendChild(child.$root);
//     }

//     public removeChild(child: BlockView): void {
//         this.block.removeChild(child.block);
//         const index = this.children.indexOf(child);
//         this.children.splice(index, 1);
//         this.$children.removeChild(child.$root);
//     }

//     public getChildBefore(child: BlockView): BlockView | undefined {
//         const index = this.children.indexOf(child);
//         if (index > 0) {
//             return this.children[index - 1];
//         }
//         return undefined;
//     }

//     public insertChild(content: string, after: BlockView | undefined): BlockView {
//         const childBlock = this.block.insertChild(content, after?.block);
//         const childView = new BlockView(this, childBlock, this.renderer, this.editor);
//         if (after === undefined) {
//             this.$children.insertAdjacentElement('afterbegin', childView.$root);
//             this.children.splice(0, 0, childView);
//         } else {
//             after.$root.insertAdjacentElement('afterend', childView.$root);
//             const index = this.children.indexOf(after);
//             this.children.splice(index, 0, childView);
//         }
//         return childView;
//     }
// }
