import { VNode } from 'snabbdom/build/package/vnode';
import { h } from 'snabbdom/build/package/h';

import { Block, AppState, BlockId, Page } from '../model';
import { BlockRenderer } from '../BlockRenderer';
import { selectBacklinks } from '../selectors/backlinks';
import { selectActivePage } from '../selectors/activePage';
import { Dispatch } from '../framework';
import { startEditing, toggleDone, setPageTitle } from '../messages/messages';
import { Editor } from './editor';

function blockContentView(block: Block, dispatch: Dispatch, blockRenderer: BlockRenderer): VNode {
    return h('div.block__content', {
        props: { innerHTML: blockRenderer.render(block) },
        on: {
            click: (event: Event): void => {
                if (event.target instanceof HTMLInputElement) {
                    dispatch(toggleDone({ blockId: block.id }));
                } else if (!(event.target instanceof HTMLAnchorElement)) {
                    dispatch(startEditing({ blockId: block.id }));
                }
            },
        },
    });
}

function blockEditorView(block: Block, pages: Page[], dispatch: Dispatch): VNode {
    return h('div.block__editor', {
        hook: {
            insert: (vnode): void => {
                if (vnode.elm instanceof HTMLElement) {
                    const editor = new Editor(block, pages, dispatch);
                    editor.appendTo(vnode.elm);
                }
            },
        },
    });
}

function blockView(
    block: Block,
    editing: BlockId | undefined,
    pages: Page[],
    dispatch: Dispatch,
    blockRenderer: BlockRenderer,
): VNode {
    return h('li.block', [
        h('div.block__inner', [
            editing === block.id
                ? blockEditorView(block, pages, dispatch)
                : blockContentView(block, dispatch, blockRenderer),
        ]),
        h(
            'ul.block__children.blocks',
            block.children.map((child) => blockView(child, editing, pages, dispatch, blockRenderer)),
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
                      page.children.map((block) =>
                          blockView(block, state.editing, state.pages, dispatch, blockRenderer),
                      ),
                  ),
                  h('h2', 'Backlinks'),
                  h(
                      'div.backlinks',
                      selectBacklinks(state).flatMap((backlinkPage) => [
                          h(
                              'h3',
                              h('a.internal', { props: { href: '/' + backlinkPage.page.id } }, backlinkPage.page.title),
                          ),
                          h(
                              'ul.blocks',
                              backlinkPage.backlinks.map((block) =>
                                  blockView(block, undefined, state.pages, dispatch, blockRenderer),
                              ),
                          ),
                      ]),
                  ),
              ],
    );
}
