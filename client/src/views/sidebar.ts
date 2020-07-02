import { VNode } from 'snabbdom/build/package/vnode';
import { h } from 'snabbdom/build/package/h';

import { AppState } from '../model';
import { Dispatch } from '../framework';
import { createSelector } from '../framework';
import { selectSearchResults } from '../selectors/searchResults';
import { setSearch } from '../messages/messages';

const selectSearchQuery = createSelector((state) => state.search);

export function sidebarView(state: AppState, dispatch: Dispatch): VNode {
    return h('div.sidebar', [
        h('form.sidebar__header', [
            h('a.internal', { props: { href: '/' } }, 'Today'),
            h('input', {
                props: { placeholder: 'Search', value: selectSearchQuery(state) },
                on: {
                    input: (event): void => dispatch(setSearch({ search: (event.target as HTMLInputElement).value })),
                },
            }),
        ]),
        h(
            'ul.sidebar__list',
            selectSearchResults(state).map((result) =>
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
