import { Observable } from './observable';
import Mark from 'mark.js';
import { assertNever, debounce } from './util';
import { Card, SearchResult } from './model';
import * as CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/base16-light.css';
import 'codemirror/mode/gfm/gfm';
import { AppEvent } from './event';

function tagsHtml(tags: string[]): string {
    return tags.map((tag) => `<a href="#/${tag}.md" class="card__tag">${tag}</a>`).join(' ');
}

function cardHtml(card: Card): string {
    const subtitle = card.subtitle ? `<div class="card__subtitle">${card.subtitle}</div>` : '';
    const tags = card.tags.length > 0 ? `<div class="card__tags">${tagsHtml(card.tags)}</div>` : '';
    const url = card.url?.startsWith('https://') || card.url?.startsWith('http://') ? card.url : '#/' + card.url;
    const linkAttr =
        card.url?.startsWith('https://') || card.url?.startsWith('http://')
            ? 'target="_blank" rel="noreferrer noopener"'
            : '';
    const showLink = url.startsWith('#/') ? '' : `<a href="#/${card.filename}" class="card__show">show</a>`;
    return `
        <div class="card">
            <div class="card__header">
                <a class="card__title" href="${url}" ${linkAttr}>
                    ${card.title}
                </a>
                <a class="card__edit" href="#/${card.filename}?edit">edit</a>
                ${showLink}
                ${subtitle}
                ${tags}
            </div>
            ${card.content
                .filter((content) => !!content)
                .map((content) => `<div class="card__content">${content}</div>`)}
        </div>
    `;
}

interface ShowState {
    type: 'show';
    card: Card;
    related: Card[];
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
        <div class="app app--highlighting">
            <div class="header">
                <a href="/#/">🏠</a>
                <a href="/#/_index.md">📁</a>
                <a href="/#/?edit" id="edit-link">✏️</a>
                <button id="save-link" class="hidden">💾</button>
                <a href="/#/" id="cancel-link" class="hidden">❌</a>
                <input placeholder="Search" id="search-input">
                <button id="toggle-highlighting"></button>
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

    const $app = document.querySelector('.app');
    const $content = document.querySelector('.content');
    const $searchResults = document.querySelector('.search__results');
    const $searchInput = document.getElementById('search-input');
    const $editLink = document.getElementById('edit-link');
    const $saveLink = document.getElementById('save-link');
    const $cancelLink = document.getElementById('cancel-link');
    const $toggleHighlighting = document.getElementById('toggle-highlighting');

    if (
        !($app instanceof HTMLElement) ||
        !($content instanceof HTMLElement) ||
        !($searchResults instanceof HTMLElement) ||
        !($searchInput instanceof HTMLInputElement) ||
        !($editLink instanceof HTMLAnchorElement) ||
        !($saveLink instanceof HTMLButtonElement) ||
        !($cancelLink instanceof HTMLAnchorElement) ||
        !($toggleHighlighting instanceof HTMLButtonElement)
    ) {
        console.error('Not all required elements found');
        return;
    }

    const debouncedQueryChangeHandler = debounce((query: string) => {
        appEvents$.next({ type: 'queryChange', query });
    }, 50);
    const hideSearch = (): void => {
        $app.classList.remove('app--searching');
    };

    $searchInput.addEventListener('input', () => debouncedQueryChangeHandler($searchInput.value));
    $searchInput.addEventListener('focus', () => {
        $app.classList.add('app--searching');
    });
    $toggleHighlighting.addEventListener('click', () => {
        $app.classList.toggle('app--highlighting');
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            $app.classList.toggle('app--highlighting');
        }
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
    let saveLinkClickListener: (() => void) | null = null;

    viewState$.subscribe((newState) => {
        if (newState.type === 'edit') {
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
                    $cancelLink.setAttribute('href', '/#/' + newState.filename);
                    if (saveLinkClickListener) {
                        $saveLink.removeEventListener('click', saveLinkClickListener);
                    }
                    saveLinkClickListener = (): void => {
                        appEvents$.next({
                            type: 'saveClick',
                            filename: newState.filename,
                            content: cm?.getValue() ?? '',
                        });
                    };
                    $saveLink.addEventListener('click', saveLinkClickListener);
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
                    // https://github.com/codemirror/CodeMirror/issues/612
                    indentUnit: 4,
                    tabSize: 4,
                    // https://github.com/codemirror/CodeMirror/issues/988#issuecomment-549644684
                    extraKeys: {
                        Tab: (cm): void => {
                            if (cm.getMode().name === 'null') {
                                cm.execCommand('insertTab');
                            } else {
                                if (cm.somethingSelected()) {
                                    cm.execCommand('indentMore');
                                } else {
                                    cm.execCommand('insertSoftTab');
                                }
                            }
                        },
                        'Shift-Tab': (cm): void => cm.execCommand('indentLess'),
                        "'['": (cm): void => {
                            if (cm.somethingSelected()) {
                                const anchor = cm.getCursor('anchor');
                                const head = cm.getCursor('head');
                                cm.replaceSelection('[' + cm.getSelection() + ']');
                                cm.setSelection(
                                    CodeMirror.Pos(anchor.line, anchor.ch + 1),
                                    CodeMirror.Pos(head.line, head.ch + 1),
                                );
                            } else {
                                cm.replaceSelection('[');
                            }
                        },
                    },
                },
            );
        } else if (newState.type === 'show') {
            $editLink.classList.remove('hidden');
            $editLink.setAttribute('href', '/#/' + newState.card.filename + '?edit');
            $saveLink.classList.add('hidden');
            $cancelLink.classList.add('hidden');
            $content.innerHTML = `
                ${cardHtml(newState.card)}
                ${newState.related.map((card) => cardHtml(card)).join('')}
            `;
            document.title = 'KB | ' + newState.card.title;
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
