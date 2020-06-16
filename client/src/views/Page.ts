import { Observable, combineLatest, of } from 'rxjs';
import * as _ from 'lodash';
import { BlockPath, Page, Block, AppStore, AppState } from '../types';
import * as actions from '../store/actions';
import { distinctUntilChanged, map, withLatestFrom } from 'rxjs/operators';
import { dateTimeToString, dateToString } from '../util';

interface BlockForView {
    rawContent: string;
    renderedContent: string;
    editing: boolean;
    children: BlockForView[];
}

function selectPageTitle(state: AppState): string | undefined {
    return state.pages.find((page) => page.id === state.activePageId)?.title;
}

function forView(block: Block): BlockForView {
    return {
        rawContent: block.content,
        renderedContent: block.content,
        editing: false,
        children: block.children.map((child) => forView(child)),
    }
}

function selectBlocks(state: AppState): BlockForView[] {
    return state.pages.find((page) => page.id === state.activePageId)?.blocks.map((block) => forView(block)) || [];
}

class BlockView extends HTMLLIElement {
    constructor(block$: Observable<BlockForView>) {
        super();
        const $content = document.createElement('div');
        block$.subscribe((block) => {
            if (block.editing) {
                const $textarea = document.createElement('textarea');
                $textarea.innerHTML = block.rawContent;
                $content.innerHTML = '';
                $content.appendChild($textarea);
            } else {
                $content.innerHTML = block.renderedContent;
            }
        });
        this.appendChild($content);
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        this.appendChild(new BlockList(block$.pipe(map((block) => block.children))));
    }
}
customElements.define('n-block', BlockView, { extends: 'li' });

class BlockList extends HTMLUListElement {
    constructor(blocks$: Observable<BlockForView[]>) {
        super();

        blocks$.subscribe((blocks) => {
            for (const block of blocks) {
                this.appendChild(new BlockView(of(block)));
            }
        });
    }
}
customElements.define('n-block-list', BlockList, { extends: 'ul' });

export class PageView extends HTMLDivElement {
    constructor(store: AppStore) {
        super();

        const title$ = store.select(selectPageTitle);
        const blocks$ = store.select(selectBlocks);

        this.classList.add('page');

        const $title = document.createElement('h1');

        const $blocks = new BlockList(blocks$);

        title$.subscribe((title) => {
            $title.innerText = title || '';
        });

        this.appendChild($title);
        this.appendChild($blocks);
    }
}
customElements.define('n-page', PageView, { extends: 'div' });

// interface BlockViewState {
//     path: BlockPath;
//     content: string;
//     children: BlockViewState[];
// }

// interface PageViewState {
//     page?: Page;
//     editing?: BlockPath;
// }

// interface PageView {
//     element: HTMLElement;
// }

// function transformBlocks(blocks: Block[], path: BlockPath): BlockViewState[] {
//     return blocks.map((block, index) => ({
//         path: [...path, index],
//         content: block.content,
//         children: transformBlocks(block.children, [...path, index]),
//     }));
// }

// function resize($textarea: HTMLTextAreaElement): void {
//     $textarea.style.height = 'auto';
//     $textarea.style.height = $textarea.scrollHeight + 'px';
// }

// function managedChildren<ParentT extends HTMLElement, ChildT>(
//     $parent: ParentT,
//     children$: Observable<ChildT[]>,
//     renderer: (child: ChildT) => HTMLElement,
// ): ParentT {
//     children$.subscribe((children) => {
//         for (const child of children) {
//             $parent.appendChild(renderer(child));
//         }
//     });
//     return $parent;
// }

// // function renderBlocks(blocks: BlockViewState[], editing: BlockPath, dispatch: (action: Action) => void): Node {
// //     if (blocks.length === 0) {
// //         return document.createDocumentFragment();
// //     }
// //     const $ul = document.createElement('ul');
// //     return managedChildren($ul, blocks, (block) => {
// //     });
// // }

// function newPage(id: string): Page {
//     const now = new Date();
//     id = id === '' ? dateToString(now) : id;
//     return {
//         id: id,
//         title: id,
//         created: dateTimeToString(now),
//         blocks: [{ content: '', children: [] }],
//     };
// }

// function renderBlock(
//     store: AppStore,
//     block: Block,
//     path: BlockPath,
//     editing: BlockPath,
// ): [HTMLElement, HTMLElement, HTMLElement] {
// const $block = document.createElement('li');
// const $content = document.createElement('div');
// const $children = document.createElement('ul');
// $block.appendChild($content);
// $block.appendChild($children);
//     console.log('render block', [path, editing]);
//     if (_.isEqual(path, editing)) {
//         const $textarea = document.createElement('textarea');
//         $textarea.classList.add('editor');
//         $textarea.innerHTML = block.content.trim();
//         $textarea.setAttribute('rows', '1');
//         $textarea.addEventListener('input', () => {
//             resize($textarea);
//             store.dispatch(actions.setEditedContent({ content: $textarea.value }));
//         });
//         $textarea.addEventListener('blur', () => {
//             store.dispatch(actions.stopEditing({}));
//         });
//         $content.innerHTML = '';
//         $content.appendChild($textarea);
//     } else {
//         $content.innerHTML = block.content;
//         $content.addEventListener('click', () => {
//             store.dispatch(actions.startEditing({ blockPath: path }));
//         });
//     }
//     renderBlocks(store, $children, block.children, path, editing);
//     return [$block, $content, $children];
// }

// function selectPageState(state: AppState): PageViewState {
//     const page = state.activePageId
//         ? state.pages.find(({ id }) => id === state.activePageId) || newPage(state.activePageId)
//         : undefined;
//     return {
//         page,
//         editing: page ? state.editing?.blockPath : undefined,
//     };
// }

// const blockElements = new Map<HTMLElement, [HTMLElement, HTMLElement][]>();

// function renderBlocks(
//     store: AppStore,
//     parent$: HTMLElement,
//     blocks: Block[],
//     path: BlockPath,
//     editing: BlockPath,
// ): void {
//     console.log('render blocks');
//     const existing = blockElements.get(parent$) || [];
//     for (const [index, [block, exItem]] of _.zip(blocks, existing).entries()) {
//         if (block && exItem) {
//             const [$content, $children] = existing[index];
//             $content.innerHTML = block.content;
//             renderBlocks(store, $children, block.children, [...path, index], editing);
//         } else if (block && !exItem) {
//             const [$block, $content, $children] = renderBlock(store, block, [...path, index], editing);
//             parent$.appendChild($block);
//             existing[index] = [$content, $children];
//         } else if (!block && exItem) {
//             const $block = exItem[0].parentElement;
//             $block?.parentElement?.removeChild($block);
//         }
//     }
//     blockElements.set(parent$, existing);
// }

// export function makePageView(store: AppStore): PageView {
//     const $page = document.createElement('div');
//     $page.classList.add('page');

//     const $title = document.createElement('h1');
//     $page.appendChild($title);

//     const $blocks = document.createElement('ul');
//     $page.appendChild($blocks);

//     const state$ = store.select(selectPageState);
//     const title$ = state$.pipe(
//         map((state) => state.page?.title || ''),
//         distinctUntilChanged(),
//     );
//     const blocks$ = state$.pipe(
//         map((state) => state.page?.blocks || []),
//         distinctUntilChanged((a, b) => _.isEqual(a, b)),
//     );
//     const editing$ = state$.pipe(map((state) => state.editing));

//     title$.subscribe((title) => {
//         $title.innerText = title;
//     });

//     combineLatest(blocks$, editing$).subscribe(([blocks, editing]) => {
//         renderBlocks(store, $blocks, blocks, [], editing || []);
//     });

//     // state$.subscribe((state) => {
//     //     // console.log('new page state', state);
//     //     // $page.innerHTML = '';
//     //     // $h1.innerText = state.page.title;
//     //     // $page.appendChild($h1);
//     //     // $page.appendChild(renderBlocks(transformBlocks(state.page.blocks, []), state.editing, dispatch));
//     //     // for (const $textarea of $page.getElementsByClassName('editor')) {
//     //     //     if ($textarea instanceof HTMLTextAreaElement) {
//     //     //         resize($textarea);
//     //     //         $textarea.focus();
//     //     //         $textarea.setSelectionRange($textarea.value.length, $textarea.value.length);
//     //     //     }
//     //     // }
//     //     // window.scrollTo(0, 0);
//     // });

//     return {
//         element: $page,
//     };
// }
