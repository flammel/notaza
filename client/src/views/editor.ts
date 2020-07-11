import { Block, Page } from '../model';
import { resizeTextarea } from '../util';
import { MessageBus } from '../framework';
import * as messages from '../messages/messages';

class Autocomplete {
    public readonly $root: HTMLElement;
    private isOpen = false;

    public constructor(private readonly pages: Page[], private readonly $textarea: HTMLTextAreaElement) {
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
                page.title.toLowerCase().includes(filter.toLowerCase()) ||
                page.id.toLowerCase().includes(filter.toLowerCase())
            ) {
                const $item = document.createElement('li');
                $item.innerText = page.title;
                $item.addEventListener('click', () => {
                    const beforeCursor = this.$textarea.value.substring(0, this.$textarea.selectionStart);
                    this.$textarea.value =
                        beforeCursor.substring(0, beforeCursor.lastIndexOf('#')) +
                        '#' +
                        page.id +
                        this.$textarea.value.substring(this.$textarea.selectionEnd);
                    this.close();
                    this.$textarea.focus();
                });
                this.$root.appendChild($item);
            }
        }
    }
}

export class Editor {
    private readonly $textarea: HTMLTextAreaElement;
    private readonly autocomplete: Autocomplete;

    private block: Block | undefined;

    public constructor(mbus: MessageBus) {
        const $textarea = document.createElement('textarea');
        $textarea.classList.add('editor');
        $textarea.addEventListener('input', () => resizeTextarea($textarea));
        $textarea.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                const contentBefore = $textarea.value.substring(0, $textarea.selectionStart);
                const contentAfter = $textarea.value.substring($textarea.selectionEnd);
                mbus.dispatch(
                    messages.splitBlock({
                        before: contentBefore,
                        after: contentAfter,
                    }),
                );
            } else if (event.key === 'Tab') {
                event.preventDefault();
                if (event.shiftKey) {
                    mbus.dispatch(messages.unindentBlock({ content: $textarea.value }));
                } else {
                    mbus.dispatch(messages.indentBlock({ content: $textarea.value }));
                }
            } else if (event.key === 'Delete' && event.ctrlKey) {
                event.preventDefault();
                mbus.dispatch(messages.removeBlock({}));
            } else if (event.key === 's' && event.ctrlKey) {
                event.preventDefault();
                mbus.dispatch(messages.stopEditing({ content: $textarea.value }));
            } else if (event.key === 'Escape') {
                event.preventDefault();
                mbus.dispatch(messages.stopEditing({ content: $textarea.value }));
            } else if (event.key === 'k' && event.ctrlKey) {
                event.preventDefault();
                this.autoLink();
            } else if (event.key === 'ArrowUp' && event.ctrlKey) {
                event.preventDefault();
                mbus.dispatch(messages.moveUp({ content: $textarea.value }));
            } else if (event.key === 'ArrowDown' && event.ctrlKey) {
                event.preventDefault();
                mbus.dispatch(messages.moveDown({ content: $textarea.value }));
            } else if (event.key === '[' && $textarea.selectionStart !== $textarea.selectionEnd) {
                event.preventDefault();
                const start = $textarea.selectionStart;
                const end = $textarea.selectionEnd;
                const value = $textarea.value;
                $textarea.value =
                    value.substring(0, start) + '[' + value.substring(start, end) + ']' + value.substring(end);
                $textarea.setSelectionRange(start + 1, end + 1);
            }
        });

        this.$textarea = $textarea;
        this.autocomplete = new Autocomplete([], $textarea);
    }

    public appendTo($parent: HTMLElement, block: Block): void {
        this.block = block;
        this.$textarea.value = block.content;
        $parent.appendChild(this.$textarea);
        $parent.appendChild(this.autocomplete.$root);
    }

    public onMount(): void {
        resizeTextarea(this.$textarea);
        this.$textarea.focus();
        this.$textarea.setSelectionRange(this.$textarea.value.length, this.$textarea.value.length);
    }

    private autoLink(): void {
        const selected = this.$textarea.value.substring(this.$textarea.selectionStart, this.$textarea.selectionEnd);
        const urlified = selected.toLowerCase().replace(' ', '-');
        this.$textarea.value =
            this.$textarea.value.substring(0, this.$textarea.selectionStart) +
            `[${selected}](./${urlified}.md)` +
            this.$textarea.value.substring(this.$textarea.selectionEnd);
    }
}
