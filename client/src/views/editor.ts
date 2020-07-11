import { Block, Page } from '../store/state';
import { Dispatch } from '../store/store';

function resizeTextarea($textarea: HTMLTextAreaElement): void {
    $textarea.setAttribute('rows', '1');
    $textarea.style.height = 'auto';
    $textarea.style.height = $textarea.scrollHeight + 'px';
}

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
    // private readonly autocomplete: Autocomplete;

    public constructor(block: Block, pages: Page[], dispatch: Dispatch) {
        const $textarea = document.createElement('textarea');
        $textarea.classList.add('editor');
        $textarea.value = block.content;
        $textarea.addEventListener('input', () => resizeTextarea($textarea));
        $textarea.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                const contentBefore = $textarea.value.substring(0, $textarea.selectionStart);
                const contentAfter = $textarea.value.substring($textarea.selectionEnd);
                dispatch({
                    type: 'SplitBlockAction',
                    before: contentBefore,
                    after: contentAfter,
                });
            } else if (event.key === 'Tab') {
                event.preventDefault();
                if (event.shiftKey) {
                    dispatch({ type: 'UnindentBlockAction', content: $textarea.value });
                } else {
                    dispatch({ type: 'IndentBlockAction', content: $textarea.value });
                }
            } else if (event.key === 'Delete' && event.ctrlKey) {
                event.preventDefault();
                dispatch({ type: 'RemoveBlockAction' });
            } else if (event.key === 's' && event.ctrlKey) {
                event.preventDefault();
                dispatch({ type: 'StopEditingAction', content: $textarea.value });
            } else if (event.key === 'Escape') {
                event.preventDefault();
                dispatch({ type: 'StopEditingAction', content: $textarea.value });
            } else if (event.key === 'k' && event.ctrlKey) {
                event.preventDefault();
                this.autoLink();
            } else if (event.key === 'ArrowUp' && event.ctrlKey) {
                event.preventDefault();
                dispatch({ type: 'MoveUpAction', content: $textarea.value });
            } else if (event.key === 'ArrowDown' && event.ctrlKey) {
                event.preventDefault();
                dispatch({ type: 'MoveDownAction', content: $textarea.value });
            } else if (event.key === '[' && $textarea.selectionStart !== $textarea.selectionEnd) {
                event.preventDefault();
                this.wrap('[', ']');
            } else if (event.key === '*' && $textarea.selectionStart !== $textarea.selectionEnd) {
                event.preventDefault();
                this.wrap('*', '*');
            } else if (event.key === '_' && $textarea.selectionStart !== $textarea.selectionEnd) {
                event.preventDefault();
                this.wrap('_', '_');
            }
        });

        this.$textarea = $textarea;
        // this.autocomplete = new Autocomplete(pages, $textarea);
    }

    private wrap(before: string, after: string): void {
        const start = this.$textarea.selectionStart;
        const end = this.$textarea.selectionEnd;
        const value = this.$textarea.value;
        this.$textarea.value =
            value.substring(0, start) + before + value.substring(start, end) + after + value.substring(end);
        this.$textarea.setSelectionRange(start + 1, end + 1);
    }

    public appendTo($parent: HTMLElement): void {
        $parent.appendChild(this.$textarea);
        // $parent.appendChild(this.autocomplete.$root);

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
