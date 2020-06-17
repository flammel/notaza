import { AppState, AppStore } from '../types';
import * as actions from '../store/actions';

interface SearchResult {
    url: string;
    title: string;
    matches: string[];
}

function selectResults(state: AppState): SearchResult[] {
    return state.pages
        .filter((page) => page.title.toLowerCase().includes(state.sidebar.query.toLowerCase()))
        .map((page) => ({
            title: page.title,
            url: page.id,
            matches: [],
        }));
}

class SearchResultView extends HTMLLIElement {
    constructor(result: SearchResult) {
        super();

        const $link = document.createElement('a');
        $link.setAttribute('href', result.url);
        $link.classList.add('internal');
        $link.innerText = result.title;

        const $matches = document.createElement('ul');
        for (const match of result.matches || []) {
            const $match = document.createElement('li');
            $match.classList.add('search-result__match');
            $match.innerHTML = match;
            // const idx = match.toLowerCase().indexOf(result.query.toLowerCase());
            // $match.appendChild(document.createTextNode(match.substring(0, idx)));
            // const $mark = document.createElement('mark');
            // $mark.innerText = match.substring(idx, idx + result.query.length);
            // $match.appendChild($mark);
            // $match.appendChild(document.createTextNode(match.substring(idx + result.query.length)));
            $matches.appendChild($match);
        }

        this.classList.add('search-result');
        this.appendChild($link);
        this.appendChild($matches);
    }
}
customElements.define('n-search-result', SearchResultView, { extends: 'li' });

export class SidebarView extends HTMLDivElement {
    constructor(store: AppStore) {
        super();

        const $pageList = document.createElement('ul');
        $pageList.classList.add('sidebar__list');

        const $input = document.createElement('input');
        $input.setAttribute('placeholder', 'Search');
        $input.addEventListener('input', () => {
            store.dispatch(actions.updateQuery({ query: $input.value }));
        });

        const $today = document.createElement('a');
        $today.setAttribute('href', '/');
        $today.classList.add('internal');
        $today.innerText = 'Today';

        const $form = document.createElement('form');
        $form.classList.add('sidebar__header');
        $form.addEventListener('submit', (event) => {
            event.preventDefault();
        });
        $form.appendChild($today);
        $form.appendChild($input);

        this.classList.add('sidebar');
        this.appendChild($form);
        this.appendChild($pageList);

        store.select(selectResults).subscribe((results) => {
            console.log('new sidebar results', results);
            const $fragment = document.createDocumentFragment();
            for (const result of results) {
                $fragment.appendChild(new SearchResultView(result));
            }
            $pageList.innerHTML = '';
            $pageList.appendChild($fragment);
        });
    }
}
customElements.define('n-sidebar', SidebarView, { extends: 'div' });

// interface SidebarViewState {
//     query: string;
//     results: SearchResult[];
// }

// interface SidebarView {
//     element: HTMLElement;
// }

// function selectSidebarState(state: AppState): SidebarViewState {
//     return {
//         query: state.sidebar.query,
//         results: state.pages
//             .filter((page) => page.title.toLowerCase().includes(state.sidebar.query.toLowerCase()))
//             .map((page) => ({
//                 title: page.title,
//                 url: page.id,
//                 matches: [],
//             })),
//     };
// }

// export function makeSidebarView(store: AppStore): SidebarView {
//     // Elements

//     const $pageList = document.createElement('ul');
//     $pageList.classList.add('sidebar__list');

//     const $input = document.createElement('input');
//     $input.setAttribute('placeholder', 'Search');

//     const $today = document.createElement('a');
//     $today.setAttribute('href', '/');
//     $today.classList.add('internal');
//     $today.innerText = 'Today';

//     const $form = document.createElement('form');
//     $form.classList.add('sidebar__header');
//     $form.addEventListener('submit', (event) => {
//         event.preventDefault();
//     });
//     $form.appendChild($today);
//     $form.appendChild($input);

//     const $sidebar = document.createElement('div');
//     $sidebar.classList.add('sidebar');
//     $sidebar.appendChild($form);
//     $sidebar.appendChild($pageList);

//     $input.addEventListener('input', () => {
//         store.dispatch(actions.updateQuery({ query: $input.value }));
//     });

//     store.select(selectSidebarState).subscribe((state) => {
//         console.log('new sidebar state', state);
//         const $fragment = document.createDocumentFragment();
//         for (const result of state.results) {
//             $fragment.appendChild(makeResult(result));
//         }
//         $pageList.innerHTML = '';
//         $pageList.appendChild($fragment);
//     });

//     return {
//         element: $sidebar,
//     };
// }

// function makeResult(result: SearchResult): HTMLLIElement {
//     const $link = document.createElement('a');
//     $link.setAttribute('href', result.url);
//     $link.classList.add('internal');
//     $link.innerText = result.title;

//     const $matches = document.createElement('ul');
//     for (const match of result.matches || []) {
//         const $match = document.createElement('li');
//         $match.classList.add('search-result__match');
//         $match.innerHTML = match;
//         // const idx = match.toLowerCase().indexOf(result.query.toLowerCase());
//         // $match.appendChild(document.createTextNode(match.substring(0, idx)));
//         // const $mark = document.createElement('mark');
//         // $mark.innerText = match.substring(idx, idx + result.query.length);
//         // $match.appendChild($mark);
//         // $match.appendChild(document.createTextNode(match.substring(idx + result.query.length)));
//         $matches.appendChild($match);
//     }

//     const $item = document.createElement('li');
//     $item.classList.add('search-result');
//     $item.appendChild($link);
//     $item.appendChild($matches);

//     return $item;
// }

// // function resultSort(a: SearchResult, b: SearchResult): number {
// //     const aIsDate = a.page.title.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
// //     const bIsDate = b.page.title.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
// //     if (aIsDate && bIsDate) {
// //         return b.page.title.localeCompare(a.page.title);
// //     } else if (aIsDate && !bIsDate) {
// //         return -1;
// //     } else if (!aIsDate && bIsDate) {
// //         return 1;
// //     } else {
// //         return a.page.title.localeCompare(b.page.title);
// //     }
// // }

// // function matchPage(page: Page, query: string): SearchResult {
// //     const matches = [page.title];
// //     return {
// //         page,
// //         query,
// //         matches:
// //             query === ''
// //                 ? []
// //                 : matches.length > 0 || page.title.toLowerCase().includes(query.toLowerCase())
// //                 ? matches
// //                 : undefined,
// //     };
// // }
