import { VNode } from 'snabbdom/build/package/vnode';
import { h } from 'snabbdom/build/package/h';

import { AppState } from '../store/state';
import * as selectors from '../selectors/selectors';
import { Dispatch } from '../store/store';

export function sidebarView(state: AppState, dispatch: Dispatch): VNode {
    return h('div.sidebar', [
        h('form.sidebar__header', [
            h('a.internal', { props: { href: '/' } }, 'Today'),
            h('input', {
                props: { placeholder: 'Search', value: selectors.querySelector(state) },
                on: {
                    input: (event: Event): void =>
                        dispatch({ type: 'SetSearchAction', search: (event.target as HTMLInputElement).value }),
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
            selectors.searchResultSelector(state).map((result) =>
                h(
                    'li.search-result',
                    {
                        on: {
                            click: (event: Event): void => {
                                if (!(event.target instanceof HTMLAnchorElement)) {
                                    window.history.pushState(null, result.url, result.url);
                                    dispatch({ type: 'SetUrlAction', url: result.url });
                                }
                            },
                        },
                    },
                    [
                        h('a.internal', {
                            props: { href: '/' + result.url, innerHTML: result.title },
                        }),
                        h(
                            'ul',
                            result.matches.map((match) =>
                                h('li.search-result__match', { props: { innerHTML: match } }),
                            ),
                        ),
                    ],
                ),
            ),
        ),
    ]);
}
