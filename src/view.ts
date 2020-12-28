import { Observable } from './observable';
import Mark from 'mark.js';
import { PageViewModel } from './viewModel';
import { assertNever, debounce } from './util';
import { Card, SearchResult } from './model';
import * as CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/base16-light.css';
import 'codemirror/mode/gfm/gfm';
import { AppEvent } from './event';

function tagsHtml(tags: string[]): string {
    return tags.map((tag) => `<a href="#/${tag}.md" class="tag">${tag}</a>`).join(' ');
}

function cardHtml(card: Card): string {
    const subtitle = card.subtitle ? `<div class="card__subtitle">${card.subtitle}</div>` : '';
    const tags = card.tags.length > 0 ? `<div class="card__tags">${tagsHtml(card.tags)}</div>` : '';
    const url = card.url?.startsWith('https://') || card.url?.startsWith('http://') ? card.url : '#/' + card.url;
    const linkAttr =
        card.url?.startsWith('https://') || card.url?.startsWith('http://')
            ? 'target="_blank" rel="noreferrer noopener"'
            : '';
    return `
        <div class="card">
            <div class="card__header">
                <a class="card__title" href="${url}" ${linkAttr}>
                    ${card.title}
                </a>
                ${subtitle}
                ${tags}
            </div>
            ${card.content
                .filter((content) => !!content)
                .map((content) => `<div class="card__content">${content}</div>`)}
        </div>
    `;
}

function hideSearch(): void {
    document.querySelector('.app')?.classList.remove('-searching');
}

interface ShowState {
    type: 'show';
    page: PageViewModel;
}
interface EditState {
    type: 'edit';
    filename: string;
    content: string;
}
interface SearchState {
    type: 'search';
    query: string;
    results: SearchResult[];
}
export type ViewState = ShowState | EditState | SearchState;

export function mountView(
    $container: HTMLElement,
    viewState$: Observable<ViewState>,
    appEvents$: Observable<AppEvent>,
): void {
    $container.innerHTML = `
        <div class="app">
            <div class="header">
                <a href="/#/">🏠</a>
                <a href="/#/_index.md">📁</a>
                <button id="edit-link">✏️</button>
                <button id="save-link" class="hidden">💾</button>
                <button id="cancel-link" class="hidden">❌</button>
                <input placeholder="Search" id="search-input">
            </div>
            <div class="content"></div>
            <div class="search">
                <h1>Search</h1>
                <div class="search__results"></div>
            </div>
            <footer class="footer">
                <a href="https://github.com/flammel/notaza" target="_blank" rel="noreferrer noopener">Github</a>
                -
                <a href="/#/_settings.md">Settings</a>
            </footer>
        </div>
    `;

    const $content = document.querySelector('.content');
    const $searchResults = document.querySelector('.search__results');
    const $searchInput = document.getElementById('search-input');
    const $editLink = document.getElementById('edit-link');
    const $saveLink = document.getElementById('save-link');
    const $cancelLink = document.getElementById('cancel-link');

    if (
        !($content instanceof HTMLElement) ||
        !($searchResults instanceof HTMLElement) ||
        !($searchInput instanceof HTMLInputElement) ||
        !($editLink instanceof HTMLButtonElement) ||
        !($saveLink instanceof HTMLButtonElement) ||
        !($cancelLink instanceof HTMLButtonElement)
    ) {
        console.error('Not all required elements found');
        return;
    }

    const debouncedQueryChangeHandler = debounce((query: string) => {
        appEvents$.next({ type: 'queryChange', query });
    }, 50);

    $searchInput.addEventListener('input', () => debouncedQueryChangeHandler($searchInput.value));
    $searchInput.addEventListener('focus', () => {
        document.querySelector('.app')?.classList.add('-searching');
    });
    document.addEventListener('click', (event) => {
        if (event.target instanceof HTMLElement) {
            if (event.target === $searchInput || event.target.closest('.search') !== null) {
                return;
            }
        }
        hideSearch();
    });

    const contentMark = new Mark($content);
    const searchResultsMark = new Mark($searchResults);
    let cm: CodeMirror.Editor | null = null;

    $editLink.addEventListener('click', () => {
        appEvents$.next({
            type: 'editClick',
            filename: $content.dataset.filename ?? '',
        });
    });

    $saveLink.addEventListener('click', () => {
        appEvents$.next({
            type: 'saveClick',
            filename: $content.dataset.filename ?? '',
            content: cm?.getValue() ?? '',
        });
    });

    $cancelLink.addEventListener('click', () => {
        appEvents$.next({
            type: 'cancelClick',
            filename: $content.dataset.filename ?? '',
        });
    });

    viewState$.subscribe((newState) => {
        if (newState.type === 'edit') {
            $content.dataset.filename = newState.filename;
            cm = CodeMirror(
                ($cm) => {
                    hideSearch();
                    const $editor = document.createElement('div');
                    $editor.classList.add('editor');
                    $editor.appendChild($cm);
                    $content.innerHTML = '';
                    $content.appendChild($editor);
                    $editLink.classList.add('hidden');
                    $saveLink.classList.remove('hidden');
                    $cancelLink.classList.remove('hidden');
                },
                {
                    value: newState.content,
                    mode: 'gfm',
                    theme: 'base16-light',
                    lineNumbers: true,
                    lineWrapping: false,
                    viewportMargin: Infinity,
                    keyMap: 'default',
                    dragDrop: false,
                },
            );
        } else if (newState.type === 'show') {
            const page = newState.page;
            $content.dataset.filename = newState.page.filename;
            $editLink.classList.remove('hidden');
            $saveLink.classList.add('hidden');
            $cancelLink.classList.add('hidden');
            $cancelLink.classList.add('hidden');
            $content.innerHTML = `
                <div class="card">${page.html}</div>
                ${page.cards.map((card) => cardHtml(card)).join('')}
            `;
            if (!($content.firstElementChild?.firstElementChild instanceof HTMLHeadingElement)) {
                const $title = document.createElement('h1');
                $title.innerHTML = page.title;
                $content.firstElementChild?.insertAdjacentElement('afterbegin', $title);
            }
            document.title = 'KB | ' + page.title;
            hideSearch();
            contentMark.unmark();
            contentMark.mark($searchInput.value);
            window.scrollTo(0, 0);
        } else if (newState.type === 'search') {
            $searchResults.innerHTML = newState.results.map((result) => cardHtml(result)).join('');
            contentMark.unmark();
            contentMark.mark($searchInput.value);
            searchResultsMark.unmark();
            searchResultsMark.mark(newState.query);
        } else {
            assertNever(newState);
        }
    });
}
