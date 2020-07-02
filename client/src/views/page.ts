import { VNode } from 'snabbdom/build/package/vnode';
import { h } from 'snabbdom/build/package/h';

import { Block, AppState, BlockId } from '../model';
import { resizeTextarea } from '../util';
import { BlockRenderer } from '../BlockRenderer';
import { selectBacklinks } from '../selectors/backlinks';
import { selectActivePage } from '../selectors/activePage';
import { Dispatch } from '../framework';
import {
    startEditing,
    toggleDone,
    splitBlock,
    unindentBlock,
    indentBlock,
    removeBlock,
    stopEditing,
    setPageTitle,
} from '../messages/messages';

function blockContentView(block: Block, dispatch: Dispatch, blockRenderer: BlockRenderer): VNode {
    return h('div.block__content', {
        props: { innerHTML: blockRenderer.render(block) },
        on: {
            click: (event: Event): void => {
                if (event.target instanceof HTMLInputElement) {
                    dispatch(toggleDone({ blockId: block.id }));
                } else {
                    dispatch(startEditing({ blockId: block.id }));
                }
            },
        },
    });
}

function blockEditorView(block: Block, dispatch: Dispatch): VNode {
    return h('textarea.block__editor.editor', {
        props: { innerHTML: block.content },
        hook: {
            insert: (vnode: VNode): void => {
                const $textarea = vnode.elm as HTMLTextAreaElement;
                resizeTextarea($textarea);
                $textarea.focus();
                $textarea.setSelectionRange($textarea.value.length, $textarea.value.length);
                $textarea.addEventListener('input', () => resizeTextarea($textarea));
                $textarea.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        const contentBefore = $textarea.value.substring(0, $textarea.selectionStart);
                        const contentAfter = $textarea.value.substring($textarea.selectionEnd);
                        dispatch(
                            splitBlock({
                                before: contentBefore,
                                after: contentAfter,
                            }),
                        );
                    } else if (event.key === 'Tab') {
                        event.preventDefault();
                        if (event.shiftKey) {
                            dispatch(unindentBlock({ content: $textarea.value }));
                        } else {
                            dispatch(indentBlock({ content: $textarea.value }));
                        }
                    } else if (event.key === 'Backspace' && $textarea.value.length === 0) {
                        event.preventDefault();
                        dispatch(removeBlock({}));
                    } else if (event.key === 's' && event.ctrlKey) {
                        event.preventDefault();
                        dispatch(stopEditing({ content: $textarea.value }));
                    } else if (event.key === 'Escape') {
                        event.preventDefault();
                        dispatch(stopEditing({ content: $textarea.value }));
                    }
                });
            },
        },
    });
}

function blockView(
    block: Block,
    editing: BlockId | undefined,
    dispatch: Dispatch,
    blockRenderer: BlockRenderer,
): VNode {
    return h('li.block', [
        h('div.block__inner', [
            editing === block.id ? blockEditorView(block, dispatch) : blockContentView(block, dispatch, blockRenderer),
        ]),
        h(
            'ul.block__children.blocks',
            block.children.map((child) => blockView(child, editing, dispatch, blockRenderer)),
        ),
    ]);
}

export function pageView(state: AppState, dispatch: Dispatch, blockRenderer: BlockRenderer): VNode {
    const page = selectActivePage(state);
    return h(
        'div.page',
        page === undefined
            ? []
            : [
                  h(
                      'h1',
                      h('input.title-editor', {
                          props: { value: page.title },
                          on: {
                              blur: (event: Event): void =>
                                  dispatch(setPageTitle({ title: (event.target as HTMLInputElement).value })),
                          },
                      }),
                  ),
                  h(
                      'ul.blocks',
                      page.children.map((block) => blockView(block, state.editing, dispatch, blockRenderer)),
                  ),
                  h('h2', 'Backlinks'),
                  h(
                      'ul.backlinks',
                      selectBacklinks(state).map((backlinkPage) =>
                          h('li', [
                              h('a.internal', { props: { href: '/' + backlinkPage.page.id } }, backlinkPage.page.title),
                              h(
                                  'ul.blocks',
                                  backlinkPage.backlinks.map((block) =>
                                      blockView(block, undefined, dispatch, blockRenderer),
                                  ),
                              ),
                          ]),
                      ),
                  ),
              ],
    );
}
