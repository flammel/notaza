import { VNode } from 'snabbdom/build/package/vnode';
import { h } from 'snabbdom/build/package/h';

import { AppState } from '../model';
import { SidebarController } from '../controller/sidebar';

export function sidebarView(state: AppState, controller: SidebarController): VNode {
    return h('div.sidebar', [
        h('form.sidebar__header', [
            h('a.internal', { props: { href: '/' } }, 'Today'),
            h('input', {
                props: { placeholder: 'Search', value: controller.getSearch(state) },
                on: {
                    input: (event): void => controller.setSearch((event.target as HTMLInputElement).value),
                },
            }),
        ]),
        h(
            'ul.sidebar__list',
            controller.getResults(state).map((result) =>
                h('li.search-result', [
                    h('a.internal', {
                        props: { href: '/' + result.url, innerHTML: result.title },
                    }),
                    h(
                        'ul',
                        result.matches.map((match) => h('li.search-result__match', { props: { innerHTML: match } })),
                    ),
                ]),
            ),
        ),
    ]);
}
