import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import * as _ from 'lodash';
import { Block, BlockPath, State, BlockContainer, PageId } from '../types';
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

type BlockWithoutChildren = Omit<BlockForView, 'children'>;

function forView(
    block: Block,
    path: BlockPath,
    editing: BlockPath | undefined,
    render: (markdown: string) => string,
): BlockForView {
    return {
        rawContent: block.content,
        renderedContent: render(block.content),
        editing: _.isEqual(path, editing),
        path,
        children: block.children.map((child, index) => forView(child, [...path, index], editing, render)),
    };
}

function blocksForView(
    blocks: Block[],
    editing: BlockPath | undefined,
    render: (markdown: string) => string,
): BlockForView[] {
    return blocks.map((block, index) => forView(block, [index], editing, render));
}

function resize($textarea: HTMLTextAreaElement): void {
    $textarea.setAttribute('rows', '1');
    $textarea.style.height = 'auto';
    $textarea.style.height = $textarea.scrollHeight + 'px';
}

function handleEditorKeyDown(
    event: KeyboardEvent,
    $textarea: HTMLTextAreaElement,
    store: Store,
    block: BlockForView,
): void {
    if (event.key === 'Enter' && !event.shiftKey) {
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
    } else if (event.key === 's' && event.ctrlKey) {
        event.preventDefault();
        store.dispatch(actions.stopEditing(block.path, $textarea.value));
    } else if (event.key === 'Escape') {
        event.preventDefault();
        store.dispatch(actions.stopEditing(block.path, $textarea.value));
    }
}

class BlockContentView extends HTMLDivElement {
    private path: BlockPath | undefined;
    private $textarea: HTMLTextAreaElement | undefined;

    constructor(store: Store, block$: Observable<BlockWithoutChildren>) {
        super();
        this.classList.add('block__content');
        this.addEventListener('click', (event) => {
            if (this.path !== undefined) {
                if (event.target instanceof HTMLInputElement && event.target.type === 'checkbox') {
                    store.dispatch(actions.onCheckboxClick(this.path));
                } else {
                    store.dispatch(actions.onBlockClick(this.path));
                }
            }
        });
        block$.pipe(distinctUntilChanged(_.isEqual)).subscribe((block) => {
            this.path = block.path;
            if (block.editing) {
                if (!this.$textarea) {
                    const $textarea = document.createElement('textarea');
                    $textarea.classList.add('editor');
                    $textarea.innerHTML = block.rawContent;
                    $textarea.addEventListener('input', () => {
                        store.dispatch(actions.onEditorInput(block.path, $textarea.value));
                        resize($textarea);
                    });
                    $textarea.addEventListener('keydown', (event) =>
                        handleEditorKeyDown(event, $textarea, store, block),
                    );
                    this.innerHTML = '';
                    this.appendChild($textarea);
                    $textarea.focus();
                    $textarea.setSelectionRange($textarea.value.length, $textarea.value.length);
                    resize($textarea);
                    this.$textarea = $textarea;
                }
            } else {
                this.innerHTML = block.renderedContent;
                this.$textarea = undefined;
            }
        });
    }

    public connectedCallback(): void {
        if (this.$textarea) {
            resize(this.$textarea);
            this.$textarea.focus();
            this.$textarea.setSelectionRange(this.$textarea.value.length, this.$textarea.value.length);
        }
    }
}
customElements.define('n-block-content', BlockContentView, { extends: 'div' });

class BlockView extends HTMLLIElement {
    constructor(store: Store, block$: Observable<BlockForView>) {
        super();
        this.classList.add('block');
        const onlyChildren$ = block$.pipe(pluck('children'), distinctUntilChanged(_.isEqual));
        const withoutChildren$ = block$.pipe(
            map((block) => _.omit(block, 'children')),
            distinctUntilChanged(_.isEqual),
        );
        withoutChildren$.subscribe(({ editing }) =>
            editing ? this.classList.add('block--editing') : this.classList.remove('block--editing'),
        );
        this.appendChild(new BlockContentView(store, withoutChildren$));
        this.appendChild(new BlockList(store, onlyChildren$));
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
                        const newView = new BlockView(store, newObservable);
                        this.appendChild(newView);
                        newObservable.subscribe({ complete: () => this.removeChild(newView) });
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

type BacklinkBlock = Block;

function getBacklinks(block: Block, target: PageId): BacklinkBlock[] {
    const result = _.flatten(block.children.map((child) => getBacklinks(child, target)));
    if (block.content.includes('](./' + target + '.md)') || block.content.includes('#' + target)) {
        result.push(block);
    }
    return result;
}

interface BacklinkPage {
    title: string;
    id: string;
    backlinks: BacklinkBlock[];
}

function selectBacklinks(state: State): BacklinkPage[] {
    const target = state.activePageId;
    if (target === undefined) {
        return [];
    }
    const pagesWithLinks = [];
    for (const page of state.pages) {
        if (page.id !== target) {
            const backlinks = [];
            for (const block of page.children) {
                backlinks.push(...getBacklinks(block, target));
            }
            if (backlinks.length > 0) {
                pagesWithLinks.push({
                    title: page.title,
                    id: page.id,
                    backlinks,
                });
            }
        }
    }
    return pagesWithLinks;
}

export class PageView extends HTMLDivElement {
    constructor(store: Store) {
        super();

        const render = (md: string): string => store.renderer.render(md);
        const page$ = store.select((state) => state.pages.find((page) => page.id === state.activePageId));
        const title$ = page$.pipe(
            map((page) => (page === undefined ? '' : page.title)),
            distinctUntilChanged(),
        );
        const blocks$ = page$.pipe(
            map((page) => (page === undefined ? [] : page.children)),
            distinctUntilChanged(_.isEqual),
        );
        const editing$ = store.select((state) => state.editing?.blockPath).pipe(distinctUntilChanged());
        const blocksForView$ = combineLatest(blocks$, editing$).pipe(
            map(([blocks, editing]) => blocksForView(blocks, editing, render)),
        );
        const backlinks$ = store.select(selectBacklinks);
        backlinks$.subscribe((backlinks) => console.log('backlinks', backlinks));

        this.classList.add('page');

        const $title = document.createElement('h1');
        title$.subscribe((title) => {
            $title.innerText = title || '';
        });
        const $blocks = new BlockList(store, blocksForView$);

        this.appendChild($title);
        this.appendChild($blocks);
        // this.appendChild($backlinks);
    }
}
customElements.define('n-page', PageView, { extends: 'div' });
