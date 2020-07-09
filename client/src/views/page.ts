import { VNode } from 'snabbdom/build/package/vnode';
import { h } from 'snabbdom/build/package/h';

import { Block, AppState } from '../model';
import { PageController } from '../controller/page';
import { Editor } from './editor';

function blockContentView(block: Block, controller: PageController): VNode {
    return h('div.block__content', {
        props: { innerHTML: controller.render(block) },
        on: {
            click: (event: Event): void => {
                if (event.target instanceof HTMLInputElement) {
                    controller.toggleDone(block);
                } else if (!(event.target instanceof HTMLAnchorElement)) {
                    controller.startEditing(block);
                }
            },
        },
    });
}

function blockEditorView(editor: Editor): VNode {
    return h('div.block__editor', {
        hook: {
            insert: (vnode): void => {
                if (vnode.elm instanceof HTMLElement) {
                    editor.appendTo(vnode.elm);
                }
            },
        },
    });
}

function blockView(state: AppState, controller: PageController, block: Block): VNode {
    return h('li.block', [
        h('div.block__inner', [
            controller.isEditing(state, block)
                ? blockEditorView(controller.getEditor(state, block))
                : blockContentView(block, controller),
        ]),
        h(
            'ul.block__children.blocks',
            block.children.map((child) => blockView(state, controller, child)),
        ),
    ]);
}

export function pageView(state: AppState, controller: PageController): VNode {
    const page = controller.getActivePage(state);
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
                                  controller.setPageTitle((event.target as HTMLInputElement).value),
                          },
                      }),
                  ),
                  h(
                      'ul.blocks',
                      page.children.map((block) => blockView(state, controller, block)),
                  ),
                  h('h2', 'Backlinks'),
                  h(
                      'div.backlinks',
                      controller.getBacklinks(state).flatMap((backlinkPage) => [
                          h(
                              'h3',
                              h('a.internal', { props: { href: '/' + backlinkPage.page.id } }, backlinkPage.page.title),
                          ),
                          h(
                              'ul.blocks',
                              backlinkPage.backlinks.map((block) => blockView(state, controller, block)),
                          ),
                      ]),
                  ),
              ],
    );
}
