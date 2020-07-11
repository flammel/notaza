import _ from 'lodash';

import { MessageBus } from '../framework';
import * as messages from '../messages/messages';
import { Editor } from './editor';
import { PageState, ViewBlock, selectPageState } from '../selectors/page';
import { AppState } from '../model';
import { BlockRenderer } from '../BlockRenderer';

export class PageView {
    private readonly $titleInput: HTMLInputElement;
    private readonly $blocks: HTMLUListElement;
    private readonly $backlinks: HTMLDivElement;

    private state: PageState | undefined;

    private readonly mbus: MessageBus;
    private readonly blockRenderer: BlockRenderer;
    private readonly editor: Editor;

    public constructor($parent: HTMLElement, mbus: MessageBus, blockRenderer: BlockRenderer) {
        this.mbus = mbus;
        this.blockRenderer = blockRenderer;
        this.editor = new Editor(mbus);

        const $root = document.createElement('div');
        $root.classList.add('page');

        const $title = document.createElement('h1');

        this.$titleInput = document.createElement('input');
        this.$titleInput.classList.add('title-editor');
        this.$titleInput.addEventListener('blur', () => {
            mbus.dispatch(messages.setPageTitle({ title: this.$titleInput.value }));
        });
        this.$titleInput.addEventListener('keydown', (event) => {
            if (event.key === 's' && event.ctrlKey) {
                event.preventDefault();
                this.$titleInput.blur();
            }
        });
        $title.appendChild(this.$titleInput);

        this.$blocks = document.createElement('ul');
        this.$blocks.classList.add('blocks');
        this.$blocks.addEventListener('click', (event) => {
            if (event.target instanceof HTMLInputElement) {
                const blockId = event.target?.parentElement?.dataset.id;
                if (blockId !== undefined) {
                    mbus.dispatch(messages.toggleDone({ blockId }));
                }
            } else if (!(event.target instanceof HTMLAnchorElement) && event.target instanceof HTMLElement) {
                const $block = event.target.closest('.block__content');
                if ($block instanceof HTMLElement) {
                    const blockId = $block.dataset.id;
                    if (blockId !== undefined) {
                        mbus.dispatch(messages.startEditing({ blockId }));
                    }
                }
            }
        });

        const $backlinksHeadline = document.createElement('h2');
        $backlinksHeadline.innerText = 'Backlinks';

        this.$backlinks = document.createElement('div');
        this.$backlinks.classList.add('backlinks');

        $root.appendChild($title);
        $root.appendChild(this.$blocks);
        $root.appendChild($backlinksHeadline);
        $root.appendChild(this.$backlinks);

        $parent.appendChild($root);
    }

    public update(state: AppState): void {
        const pageState = selectPageState(state, this.blockRenderer);
        if (pageState !== undefined) {
            this.$titleInput.value = pageState?.title;
            this.updateBlocks(pageState);
            this.updateBacklinks(pageState);
            this.state = pageState;
        }
    }

    private updateBlocks(state: PageState): void {
        if (_.isEqual(state.children, this.state?.children)) {
            return;
        }
        const $fragment = document.createDocumentFragment();
        for (const block of state.children) {
            $fragment.appendChild(this.renderBlock(block));
        }
        this.$blocks.innerHTML = '';
        this.$blocks.appendChild($fragment);
        this.editor.onMount();
    }

    private updateBacklinks(state: PageState): void {
        if (_.isEqual(state.backlinks, this.state?.backlinks)) {
            return;
        }
        const $fragment = document.createDocumentFragment();
        for (const pwb of state.backlinks) {
            const $link = document.createElement('a');
            $link.classList.add('internal');
            $link.href = '/' + pwb.page.id;
            $link.innerHTML = pwb.page.title;
            const $headline = document.createElement('h2');
            $headline.appendChild($link);
            const $blocks = document.createElement('ul');
            $blocks.classList.add('blocks');
            for (const block of pwb.backlinks) {
                $blocks.appendChild(this.renderBlock(block));
            }
            $fragment.appendChild($headline);
            $fragment.appendChild($blocks);
        }
        this.$backlinks.innerHTML = '';
        this.$backlinks.appendChild($fragment);
    }

    private renderBlock(block: ViewBlock): HTMLLIElement {
        const $block = document.createElement('li');
        $block.classList.add('block');

        const $inner = document.createElement('div');
        $inner.classList.add('block__inner');
        $inner.appendChild(this.renderBlockInner(block));

        const $children = document.createElement('ul');
        for (const child of block.children) {
            $children.appendChild(this.renderBlock(child));
        }

        $block.appendChild($inner);
        $block.appendChild($children);
        return $block;
    }

    private renderBlockInner(block: ViewBlock): HTMLDivElement {
        const $result = document.createElement('div');
        if (block.editing) {
            $result.classList.add('block__editor');
            this.editor.appendTo($result, block.block);
        } else {
            $result.classList.add('block__content');
            $result.dataset.id = block.block.id;
            $result.innerHTML = block.html;
        }
        return $result;
    }
}
