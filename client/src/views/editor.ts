import { Block, Page } from '../store/state';
import { Dispatch } from '../store/store';

class Autocomplete {
    public readonly $root: HTMLElement;
    private pages: Page[] = [];
    private isOpen = false;

    public constructor(private readonly $textarea: HTMLTextAreaElement) {
        this.$root = document.createElement('ul');
        this.$root.classList.add('autocomplete');
        this.$root.style.display = 'none';

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

    public setPages(pages: Page[]): void {
        this.pages = pages;
    }

    private close(): void {
        this.$root.innerHTML = '';
        this.$root.style.display = 'none';
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
                $item.addEventListener('mousedown', (event) => event.preventDefault());
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
        this.$root.style.display = 'block';
    }
}

export class Editor {
    private readonly $textarea: HTMLTextAreaElement;
    private stopOnBlur = false;
    private readonly autocomplete: Autocomplete;

    public constructor(dispatch: Dispatch) {
        const $textarea = document.createElement('textarea');
        $textarea.classList.add('editor');
        $textarea.addEventListener('input', () => this.autoResize());
        $textarea.addEventListener('keydown', (event) => this.handleKeyDown(event, dispatch));
        $textarea.addEventListener('blur', () => {
            if (this.stopOnBlur) {
                this.stopOnBlur = false;
                dispatch({ type: 'StopEditingAction', content: $textarea.value });
            }
        });
        this.$textarea = $textarea;
        this.autocomplete = new Autocomplete($textarea);
    }

    private handleKeyDown(event: KeyboardEvent, dispatch: Dispatch): void {
        const $textarea = this.$textarea;
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const contentBefore = $textarea.value.substring(0, $textarea.selectionStart);
            const contentAfter = $textarea.value.substring($textarea.selectionEnd);
            this.stopOnBlur = false;
            dispatch({
                type: 'SplitBlockAction',
                before: contentBefore,
                after: contentAfter,
            });
        } else if (event.key === 'Tab') {
            event.preventDefault();
            this.stopOnBlur = false;
            if (event.shiftKey) {
                dispatch({ type: 'UnindentBlockAction', content: $textarea.value });
            } else {
                dispatch({ type: 'IndentBlockAction', content: $textarea.value });
            }
        } else if (event.key === 'Delete' && event.ctrlKey) {
            event.preventDefault();
            this.stopOnBlur = false;
            dispatch({ type: 'RemoveBlockAction' });
        } else if (event.key === 's' && event.ctrlKey) {
            event.preventDefault();
            this.stopOnBlur = false;
            dispatch({ type: 'StopEditingAction', content: $textarea.value });
        } else if (event.key === 'Escape') {
            event.preventDefault();
            this.stopOnBlur = false;
            dispatch({ type: 'StopEditingAction', content: $textarea.value });
        } else if (event.key === 'k' && event.ctrlKey) {
            event.preventDefault();
            this.autoLink();
        } else if (event.key === 'ArrowUp' && event.ctrlKey) {
            event.preventDefault();
            this.stopOnBlur = false;
            dispatch({ type: 'MoveUpAction', content: $textarea.value });
        } else if (event.key === 'ArrowDown' && event.ctrlKey) {
            event.preventDefault();
            this.stopOnBlur = false;
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
    }

    public start($parent: HTMLElement, block: Block): void {
        this.$textarea.value = block.content;
        this.stopOnBlur = true;
        $parent.appendChild(this.$textarea);
        $parent.appendChild(this.autocomplete.$root);

        this.autoResize();
        this.$textarea.focus();
        this.$textarea.setSelectionRange(this.$textarea.value.length, this.$textarea.value.length);
    }

    public setPages(pages: Page[]): void {
        this.autocomplete.setPages(pages);
    }

    private wrap(before: string, after: string): void {
        const start = this.$textarea.selectionStart;
        const end = this.$textarea.selectionEnd;
        const value = this.$textarea.value;
        this.$textarea.value =
            value.substring(0, start) + before + value.substring(start, end) + after + value.substring(end);
        this.$textarea.setSelectionRange(start + 1, end + 1);
    }

    private autoLink(): void {
        const selected = this.$textarea.value.substring(this.$textarea.selectionStart, this.$textarea.selectionEnd);
        const urlified = selected.toLowerCase().replace(' ', '-');
        this.$textarea.value =
            this.$textarea.value.substring(0, this.$textarea.selectionStart) +
            `[${selected}](./${urlified}.md)` +
            this.$textarea.value.substring(this.$textarea.selectionEnd);
    }

    private autoResize(): void {
        this.$textarea.setAttribute('rows', '1');
        this.$textarea.style.height = 'auto';
        this.$textarea.style.height = this.$textarea.scrollHeight + 'px';
    }
}
