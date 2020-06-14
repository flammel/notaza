import { Observable } from 'rxjs';
import * as _ from 'lodash';
import { BlockPath, Page, Block } from '../types';
import { Action } from '../store/store';
import * as actions from '../store/actions';

function transformBlocks(blocks: Block[], path: BlockPath): BlockViewState[] {
    return blocks.map((block, index) => ({
        path: [...path, index],
        content: block.content,
        children: transformBlocks(block.children, [...path, index]),
    }));
}

export interface BlockViewState {
    path: BlockPath;
    content: string;
    children: BlockViewState[];
}

export interface PageViewState {
    page: Page;
    editing: BlockPath;
}

interface PageView {
    element: HTMLElement;
}

function resize($textarea: HTMLTextAreaElement): void {
    $textarea.style.height = 'auto';
    $textarea.style.height = $textarea.scrollHeight + 'px';
}

function renderBlocks(blocks: BlockViewState[], editing: BlockPath, dispatch: (action: Action) => void): Node {
    if (blocks.length === 0) {
        return document.createDocumentFragment();
    }
    const $ul = document.createElement('ul');
    for (const block of blocks) {
        const $li = document.createElement('li');
        if (_.isEqual(block.path, editing)) {
            const $textarea = document.createElement('textarea');
            $textarea.classList.add('editor');
            $textarea.innerHTML = block.content.trim();
            $textarea.setAttribute('rows', '1');
            $textarea.addEventListener('input', () => {
                resize($textarea);
                dispatch(actions.setEditedContent({ content: $textarea.value }));
            });
            $textarea.addEventListener('blur', () => {
                dispatch(actions.stopEditing({}));
            });
            $li.appendChild($textarea);
        } else {
            const $div = document.createElement('div');
            $div.innerHTML = block.content;
            $div.addEventListener('click', () => dispatch(actions.startEditing({ blockPath: block.path })));
            $li.appendChild($div);
        }
        $li.appendChild(renderBlocks(block.children, editing, dispatch));
        $ul.appendChild($li);
    }
    return $ul;
}

export function makePageView(state$: Observable<PageViewState>, dispatch: (action: Action) => void): PageView {
    const $page = document.createElement('div');
    $page.classList.add('page');

    state$.subscribe((state) => {
        console.log('new page state', state);
        $page.innerHTML = '';
        const $h1 = document.createElement('h1');
        $h1.innerText = state.page.title;
        $page.appendChild($h1);
        $page.appendChild(renderBlocks(transformBlocks(state.page.blocks, []), state.editing, dispatch));
        for (const $textarea of $page.getElementsByClassName('editor')) {
            if ($textarea instanceof HTMLTextAreaElement) {
                resize($textarea);
                $textarea.focus();
                $textarea.setSelectionRange($textarea.value.length, $textarea.value.length);
            }
        }
        window.scrollTo(0, 0);
    });

    return {
        element: $page,
    };
}
