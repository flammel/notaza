import { VNode } from 'snabbdom/build/package/vnode';
import { h } from 'snabbdom/build/package/h';

import { Dispatch } from '../framework';
import { startEditing, toggleDone, setPageTitle } from '../messages/messages';
import { Editor } from './editor';
import { PageState, ViewBlock, RenderedBlock, EditingBlock } from '../selectors/page';

function blockContentView(block: RenderedBlock, dispatch: Dispatch): VNode {
    return h('div.block__content', {
        props: { innerHTML: block.html },
        on: {
            click: (event: Event): void => {
                if (event.target instanceof HTMLInputElement) {
                    dispatch(toggleDone({ blockId: block.block.id }));
                } else if (!(event.target instanceof HTMLAnchorElement)) {
                    dispatch(startEditing({ blockId: block.block.id }));
                }
            },
        },
    });
}

function blockEditorView(block: EditingBlock, dispatch: Dispatch): VNode {
    return h('div.block__editor', {
        hook: {
            insert: (vnode): void => {
                if (vnode.elm instanceof HTMLElement) {
                    const editor = new Editor(block.block, [], dispatch);
                    editor.appendTo(vnode.elm);
                }
            },
        },
    });
}

function blockView(block: ViewBlock, dispatch: Dispatch): VNode {
    return h('li.block', [
        h('div.block__inner', [block.editing ? blockEditorView(block, dispatch) : blockContentView(block, dispatch)]),
        h(
            'ul.block__children.blocks',
            block.children.map((child) => blockView(child, dispatch)),
        ),
    ]);
}

export function pageView(state: PageState | undefined, dispatch: Dispatch): VNode {
    return h(
        'div.page',
        state === undefined
            ? []
            : [
                  h(
                      'h1',
                      h('input.title-editor', {
                          props: { value: state.title },
                          on: {
                              blur: (event: Event): void =>
                                  dispatch(setPageTitle({ title: (event.target as HTMLInputElement).value })),
                          },
                      }),
                  ),
                  h(
                      'ul.blocks',
                      state.children.map((block) => blockView(block, dispatch)),
                  ),
                  h('h2', 'Backlinks'),
                  h(
                      'div.backlinks',
                      state.backlinks.flatMap((backlinkPage) => [
                          h(
                              'h3',
                              h('a.internal', { props: { href: '/' + backlinkPage.page.id } }, backlinkPage.page.title),
                          ),
                          h(
                              'ul.blocks',
                              backlinkPage.backlinks.map((block) => blockView(block, dispatch)),
                          ),
                      ]),
                  ),
              ],
    );
}
