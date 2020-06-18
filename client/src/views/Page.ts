import { Observable, Subject, BehaviorSubject } from 'rxjs';
import * as _ from 'lodash';
import { Block, State, BlockPath } from '../types';
import { map, distinctUntilChanged, pluck } from 'rxjs/operators';
import { Store } from '../store';
import * as actions from '../actions';
import { Renderer } from '../Renderer';

interface BlockForView {
    rawContent: string;
    renderedContent: string;
    editing: boolean;
    children: BlockForView[];
    path: BlockPath;
}

function selectPageTitle(state: State): string | undefined {
    return state.pages.find((page) => page.id === state.activePageId)?.title;
}

function forView(block: Block, path: BlockPath, editing: BlockPath | undefined): BlockForView {
    return {
        rawContent: block.content,
        renderedContent: block.content,
        editing: _.isEqual(path, editing),
        path,
        children: block.children.map((child, index) => forView(child, [...path, index], editing)),
    };
}

function selectBlocks(state: State): BlockForView[] {
    return (
        state.pages
            .find((page) => page.id === state.activePageId)
            ?.children.map((block, index) => forView(block, [index], state.editing?.blockPath)) || []
    );
}

function resize($textarea: HTMLTextAreaElement): void {
    $textarea.setAttribute('rows', '1');
    $textarea.style.height = 'auto';
    $textarea.style.height = $textarea.scrollHeight + 'px';
}

function handleEditorKeyUp(
    event: KeyboardEvent,
    $textarea: HTMLTextAreaElement,
    store: Store,
    block: BlockForView,
): void {
    if (event.key === 'Escape') {
        event.preventDefault();
        store.dispatch(actions.stopEditing(block.path, $textarea.value));
    }
}

function handleEditorKeyDown(
    event: KeyboardEvent,
    $textarea: HTMLTextAreaElement,
    store: Store,
    block: BlockForView,
): void {
    if (event.key === 'Enter') {
        event.preventDefault();
        const contentBefore = $textarea.value.substring(0, $textarea.selectionStart);
        const contentAfter = $textarea.value.substring($textarea.selectionEnd);
        store.dispatch(actions.splitBlock(block.path, contentBefore, contentAfter));
    } else if (event.key === 'Tab') {
        event.preventDefault();
        if (event.shiftKey) {
            store.dispatch(actions.decreaseLevel(block.path, $textarea.value));
        } else {
            store.dispatch(actions.increaseLevel(block.path, $textarea.value));
        }
    } else if (event.key === 'Delete' && $textarea.value.length === 0) {
        event.preventDefault();
        store.dispatch(actions.deleteBlock(block.path));
    } else if (event.key === 'Backspace' && $textarea.value.length === 0) {
        event.preventDefault();
        store.dispatch(actions.deleteBlock(block.path));
    } else if (event.key === 'ArrowUp' && event.shiftKey) {
        event.preventDefault();
        store.dispatch(actions.startEditingPrevious(block.path, $textarea.value));
    } else if (event.key === 'ArrowDown' && event.shiftKey) {
        event.preventDefault();
        store.dispatch(actions.startEditingNext(block.path, $textarea.value));
    }
}

class BlockView extends HTMLLIElement {
    private path: BlockPath | undefined;
    private $textarea: HTMLTextAreaElement | undefined;

    constructor(store: Store, block$: Observable<BlockForView>) {
        super();
        const $content = document.createElement('div');
        $content.classList.add('block__content');
        $content.addEventListener('click', () => {
            if (this.path !== undefined) {
                store.dispatch(actions.onBlockClick(this.path));
            }
        });

        const onlyChildren$ = block$.pipe(pluck('children'), distinctUntilChanged(_.isEqual));
        const withoutChildren$ = block$.pipe(
            map((block) => _.omit(block, 'children')),
            distinctUntilChanged(_.isEqual),
        );

        withoutChildren$.pipe(distinctUntilChanged(_.isEqual)).subscribe(
            (block) => {
                this.path = block.path;
                if (block.editing) {
                    this.classList.add('block--editing');
                    const $textarea = document.createElement('textarea');
                    $textarea.classList.add('editor');
                    $textarea.innerHTML = block.rawContent;
                    $textarea.addEventListener('input', () => {
                        store.dispatch(actions.onEditorInput(block.path, $textarea.value));
                        resize($textarea);
                    });
                    $textarea.addEventListener('keyup', (event) => handleEditorKeyUp(event, $textarea, store, block));
                    $textarea.addEventListener('keydown', (event) =>
                        handleEditorKeyDown(event, $textarea, store, block),
                    );
                    $content.innerHTML = '';
                    $content.appendChild($textarea);
                    $textarea.focus();
                    $textarea.setSelectionRange($textarea.value.length, $textarea.value.length);
                    resize($textarea);
                    this.$textarea = $textarea;
                } else {
                    this.classList.remove('block--editing');
                    $content.innerHTML = new Renderer().render(block.renderedContent);
                    this.$textarea = undefined;
                }
            },
            undefined,
            () => {
                this.parentElement?.removeChild(this);
            },
        );
        this.appendChild($content);
        this.appendChild(new BlockList(store, onlyChildren$));
    }

    public connectedCallback(): void {
        if (this.$textarea) {
            resize(this.$textarea);
            this.$textarea.focus();
            this.$textarea.setSelectionRange(this.$textarea.value.length, this.$textarea.value.length);
        }
    }
}
customElements.define('n-block', BlockView, { extends: 'li' });

class BlockList extends HTMLUListElement {
    constructor(store: Store, blocks$: Observable<BlockForView[]>) {
        super();

        const observables: Subject<BlockForView>[] = [];
        blocks$.subscribe((blocks) => {
            for (const [block, observable] of _.zip(blocks, observables)) {
                if (block) {
                    if (observable) {
                        observable.next(block);
                    } else {
                        const newObservable = new BehaviorSubject<BlockForView>(block);
                        observables.push(newObservable);
                        this.appendChild(new BlockView(store, newObservable));
                    }
                } else {
                    if (observable) {
                        observable.complete();
                        observables.pop();
                    }
                }
            }
        });
    }
}
customElements.define('n-block-list', BlockList, { extends: 'ul' });

export class PageView extends HTMLDivElement {
    constructor(store: Store) {
        super();

        const title$ = store.select(selectPageTitle);
        const blocks$ = store.select(selectBlocks);

        this.classList.add('page');

        const $title = document.createElement('h1');

        const $blocks = new BlockList(store, blocks$);

        title$.subscribe((title) => {
            $title.innerText = title || '';
        });

        this.appendChild($title);
        this.appendChild($blocks);
    }
}
customElements.define('n-page', PageView, { extends: 'div' });
