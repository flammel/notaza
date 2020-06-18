import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import * as _ from 'lodash';
import { Block, BlockPath, State, BlockContainer, PageId, Page } from '../types';
import { map, distinctUntilChanged, pluck, mapTo, withLatestFrom, share } from 'rxjs/operators';
import { Store } from '../store';
import * as actions from '../actions';
import { Renderer } from '../Renderer';

interface BlockForView {
    rawContent: string;
    renderedContent: string;
    editing: boolean;
    path: BlockPath;
}

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

    constructor(store: Store, path$: Observable<BlockPath>) {
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

        store.select((state) => state.pages.find((page) => page.id === state.activePageId)).subscribe((p) => console.log('p', p));
        path$
            .pipe(
                map((path) => {
                    console.log('content path before', path);
                    return path;
                }),
                withLatestFrom(store.select((state) => state.pages.find((page) => page.id === state.activePageId))),
                map(([path, page]) => {
                    console.log('content path after', path);
                    return [path, page] as [BlockPath, Page | undefined];
                }),
                map(([path, page]) => {
                    console.log('content combine');
                    if (page !== undefined) {
                        const block = getBlock(page, path);
                        if (block !== undefined) {
                            return {
                                editing: false,
                                path,
                                rawContent: block.content,
                                renderedContent: block.content,
                            };
                        }
                    }
                    return {
                        editing: false,
                        path,
                        rawContent: '',
                        renderedContent: '',
                    };
                }),
            )
            .subscribe((block: BlockForView) => {
                console.log('content path', block.path);
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
    constructor(store: Store, path$: Observable<BlockPath>) {
        super();
        this.classList.add('block');
        path$.subscribe((path) => console.log('blockv iew path' , path));
        this.appendChild(new BlockContentView(store, path$));
        this.appendChild(new BlockList(store, path$));
    }
}
customElements.define('n-block', BlockView, { extends: 'li' });

function indices<T>(arr: T[]): number[] {
    return arr.map((_element, index) => index);
}

function getBlock(parent: BlockContainer, path: BlockPath): Block | undefined {
    const head = _.head(path);
    if (head !== undefined) {
        const newParent = parent.children[head];
        if (newParent !== undefined) {
            const tail = _.tail(path);
            return tail.length === 0 ? newParent : getBlock(newParent, tail);
        }
    }
}

class BlockList extends HTMLUListElement {
    constructor(store: Store, path$: Observable<BlockPath>) {
        super();
        const observables: Subject<BlockPath>[] = [];
        combineLatest(
            path$,
            store.select((state) => state.pages.find((page) => page.id === state.activePageId)),
        )
            .pipe(
                map(([path, page]) => {
                    console.log('list combine', [path, page]);
                    if (page === undefined) {
                        return [];
                    } else {
                        if (path.length === 0) {
                            return indices(page.children || []).map((index) => [...path, index]);
                        } else {
                            return indices(getBlock(page, path)?.children || []).map((index) => [...path, index]);
                        }
                    }
                }),
                share(),
            )
            .subscribe((paths) => {
                console.log('list paths', paths);
                for (const [path, observable] of _.zip(paths, observables)) {
                    if (path) {
                        if (observable) {
                            observable.next(path);
                        } else {
                            const newObservable = new Subject<BlockPath>();
                            observables.push(newObservable);
                            const newView = new BlockView(store, newObservable.pipe(share()));
                            newObservable.next(path);
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

class BacklinksView extends HTMLDivElement {
    constructor(store: Store, block$: Observable<BacklinkPage[]>) {
        super();
        this.classList.add('backlinks');

        const $headline = document.createElement('h2');
        $headline.innerText = 'Backlinks';
        this.appendChild($headline);

        const $list = document.createElement('ul');
        this.appendChild($list);

        block$.subscribe((pwbs) => {
            $list.innerHTML = pwbs
                .map(
                    (pwb) => `
                    <li>
                        <a href="./${pwb.id}" class="internal">${pwb.title}</a>
                        <ul>
                            ${pwb.backlinks
                                .map(
                                    (block) => `
                                <li>${block.content}</li>
                            `,
                                )
                                .join('')}
                        </ul>
                    </li>`,
                )
                .join('');
        });
    }
}
customElements.define('n-backlinks', BacklinksView, { extends: 'div' });

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
        const backlinks$ = store.select(selectBacklinks).pipe(
            map((pwbs) =>
                pwbs.map((pwb) => ({
                    ...pwb,
                    backlinks: pwb.backlinks.map((block) => ({ ...block, content: render(block.content) })),
                })),
            ),
        );
        backlinks$.subscribe((backlinks) => console.log('backlinks', backlinks));

        this.classList.add('page');

        const $title = document.createElement('h1');
        title$.subscribe((title) => {
            $title.innerText = title || '';
        });

        this.appendChild($title);
        this.appendChild(new BlockList(store, page$.pipe(mapTo([]), share())));
        this.appendChild(new BacklinksView(store, backlinks$));
    }
}
customElements.define('n-page', PageView, { extends: 'div' });
