import { VNode } from 'snabbdom/build/package/vnode';
import { h } from 'snabbdom/build/package/h';

import { Dispatch } from '../framework';
import { setSearch } from '../messages/messages';
import { SidebarState } from '../selectors/sidebar';

export function sidebarView(state: SidebarState, dispatch: Dispatch): VNode {
    return h('div.sidebar', [
        h('form.sidebar__header', [
            h('a.internal', { props: { href: '/' } }, 'Today'),
            h('input', {
                props: { placeholder: 'Search', value: state.query },
                on: {
                    input: (event: Event): void =>
                        dispatch(setSearch({ search: (event.target as HTMLInputElement).value })),
                    keydown: (event: Event): void => {
                        if (event instanceof KeyboardEvent && event.key === 'Enter') {
                            event.preventDefault();
                        }
                    },
                },
            }),
        ]),
        h(
            'ul.sidebar__list',
            state.results.map((result) =>
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
