import { VNode } from 'snabbdom/build/package/vnode';
import { h } from 'snabbdom/build/package/h';

import { Editor } from './editor';
import { AppState, Block, PageId, AbsoluteBlockId } from '../store/state';
import * as selectors from '../selectors/selectors';
import { Dispatch } from '../store/store';
import { BlockRenderer } from '../service/BlockRenderer';
import { actions } from '../store/action';
import { absoluteBlockId } from '../util';

function blockContentView(pageId: PageId, block: Block, dispatch: Dispatch, blockRenderer: BlockRenderer): VNode {
    return h('div.block__content', {
        props: { innerHTML: blockRenderer.render(block) },
        on: {
            click: (event: Event): void => {
                if (event.target instanceof HTMLInputElement) {
                    dispatch({ type: 'ToggleDoneAction', blockId: absoluteBlockId(pageId, block.id) });
                } else if (!(event.target instanceof HTMLAnchorElement)) {
                    dispatch({ type: 'StartEditingAction', blockId: absoluteBlockId(pageId, block.id) });
                }
            },
        },
    });
}

function blockEditorView(block: Block, editor: Editor): VNode {
    return h('div.block__editor', {
        hook: {
            insert: (vnode): void => {
                if (vnode.elm instanceof HTMLElement) {
                    editor.start(vnode.elm, block);
                }
            },
        },
    });
}

function blockView(
    pageId: PageId,
    block: Block,
    editingId: AbsoluteBlockId | undefined,
    dispatch: Dispatch,
    blockRenderer: BlockRenderer,
    editor: Editor,
): VNode {
    return h('li.block', [
        h('div.block__inner', [
            block.id === editingId?.blockId
                ? blockEditorView(block, editor)
                : blockContentView(pageId, block, dispatch, blockRenderer),
        ]),
        h(
            'ul.block__children.blocks',
            block.children.map((child) => blockView(pageId, child, editingId, dispatch, blockRenderer, editor)),
        ),
    ]);
}

export function pageView(
    state: AppState,
    dispatch: Dispatch,
    blockRenderer: BlockRenderer,
    editor: Editor,
    pageId: PageId,
): VNode {
    const page = selectors.pageSelector(pageId)(state);
    return h(
        'div.page',
        page === undefined
            ? []
            : [
                  h(
                      'h1',
                      h('input.title-editor', {
                          props: { value: page.page.title },
                          on: {
                              blur: (event: Event): void =>
                                  dispatch({
                                      type: 'SetPageTitleAction',
                                      pageId: page.page.id,
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
                      page.page.children.map((block) =>
                          blockView(page.page.id, block, state.editing, dispatch, blockRenderer, editor),
                      ),
                  ),
                  h('h2', 'Backlinks'),
                  h(
                      'div.backlinks',
                      page.backlinks.flatMap((backlinkPage) => [
                          h(
                              'h3',
                              h('a.internal', { props: { href: '/' + backlinkPage.page.id } }, backlinkPage.page.title),
                          ),
                          h(
                              'ul.blocks',
                              backlinkPage.backlinks.map((block) =>
                                  blockView(page.page.id, block, undefined, dispatch, blockRenderer, editor),
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
