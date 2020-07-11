import { VNode } from 'snabbdom/build/package/vnode';
import { h } from 'snabbdom/build/package/h';

import { Editor } from './editor';
import { AppState, Block, BlockId } from '../store/state';
import * as selectors from '../selectors/selectors';
import { Dispatch } from '../store/store';
import { BlockRenderer } from '../BlockRenderer';
import { actions } from '../store/action';

function blockContentView(block: Block, dispatch: Dispatch, blockRenderer: BlockRenderer): VNode {
    return h('div.block__content', {
        props: { innerHTML: blockRenderer.render(block) },
        on: {
            click: (event: Event): void => {
                if (event.target instanceof HTMLInputElement) {
                    dispatch({ type: 'ToggleDoneAction', blockId: block.id });
                } else if (!(event.target instanceof HTMLAnchorElement)) {
                    dispatch({ type: 'StartEditingAction', blockId: block.id });
                }
            },
        },
    });
}

function blockEditorView(block: Block, dispatch: Dispatch): VNode {
    return h('div.block__editor', {
        hook: {
            insert: (vnode): void => {
                if (vnode.elm instanceof HTMLElement) {
                    const editor = new Editor(block, [], dispatch);
                    editor.appendTo(vnode.elm);
                }
            },
        },
    });
}

function blockView(
    block: Block,
    editingId: BlockId | undefined,
    dispatch: Dispatch,
    blockRenderer: BlockRenderer,
): VNode {
    return h('li.block', [
        h('div.block__inner', [
            block.id === editingId
                ? blockEditorView(block, dispatch)
                : blockContentView(block, dispatch, blockRenderer),
        ]),
        h(
            'ul.block__children.blocks',
            block.children.map((child) => blockView(child, editingId, dispatch, blockRenderer)),
        ),
    ]);
}

export function pageView(state: AppState, dispatch: Dispatch, blockRenderer: BlockRenderer): VNode {
    const activePage = selectors.activePageSelector(state);
    return h(
        'div.page',
        activePage === undefined
            ? []
            : [
                  h(
                      'h1',
                      h('input.title-editor', {
                          props: { value: activePage.page.title },
                          on: {
                              blur: (event: Event): void =>
                                  dispatch({
                                      type: 'SetPageTitleAction',
                                      title: (event.target as HTMLInputElement).value,
                                  }),
                              keydown: (event: Event): void => {
                                  if (event instanceof KeyboardEvent && event.target instanceof HTMLInputElement) {
                                      if ((event.key === 's' && event.ctrlKey) || event.key === 'Escape') {
                                          event.preventDefault();
                                          event.target.blur();
                                      }
                                  }
                              },
                          },
                      }),
                  ),
                  h(
                      'ul.blocks',
                      activePage.page.children.map((block) => blockView(block, state.editing, dispatch, blockRenderer)),
                  ),
                  h('h2', 'Backlinks'),
                  h(
                      'div.backlinks',
                      activePage.backlinks.flatMap((backlinkPage) => [
                          h(
                              'h3',
                              h('a.internal', { props: { href: '/' + backlinkPage.page.id } }, backlinkPage.page.title),
                          ),
                          h(
                              'ul.blocks',
                              backlinkPage.backlinks.map((block) =>
                                  blockView(block, undefined, dispatch, blockRenderer),
                              ),
                          ),
                      ]),
                  ),
                  h(
                      'form',
                      {
                          on: {
                              submit: (event: Event): void => {
                                  event.preventDefault();
                                  const form = event.target;
                                  if (form instanceof HTMLFormElement) {
                                      const input = form.querySelector('[type=file]');
                                      if (input instanceof HTMLInputElement) {
                                          const file = input.files?.item(0);
                                          if (file instanceof File) {
                                              dispatch(actions.upload(file));
                                          }
                                      }
                                  }
                              },
                          },
                      },
                      [
                          h('input', { props: { type: 'file', required: true } }),
                          h('button', { props: { type: 'submit' } }, 'Upload'),
                      ],
                  ),
              ],
    );
}
