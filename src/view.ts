import { Observable } from './observable';
import Mark from 'mark.js';
import { PageViewModel, SearchViewModel } from './viewModel';
import { debounce } from './util';
import { Card } from './model';
import * as CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/base16-light.css';
import 'codemirror/mode/gfm/gfm';

function tagsHtml(tags: string[]): string {
    return tags.map((tag) => `<a href="#/${tag}.md" class="tag">${tag}</a>`).join(' ');
}

function cardHtml(card: Card): string {
    const subtitle = card.subtitle ? `<div class="card__subtitle">${card.subtitle}</div>` : '';
    const tags = card.tags ? `<div class="card__tags">${tagsHtml(card.tags)}</div>` : '';
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

export function mountView(
    $container: HTMLElement,
    currentPage$: Observable<PageViewModel>,
    search$: Observable<SearchViewModel>,
): void {
    $container.innerHTML = `
        <div class="app">
            <div class="header">
                <a href="/#/">🏠</a>
                <a href="/#/_index.md">📁</a>
                <button id="edit-link">✏️</button>
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

    if (
        !($content instanceof HTMLElement) ||
        !($searchResults instanceof HTMLElement) ||
        !($searchInput instanceof HTMLInputElement) ||
        !($editLink instanceof HTMLButtonElement)
    ) {
        console.error('Not all required elements found');
        return;
    }

    const debouncedQueryChangeHandler = debounce((query: string) => {
        window.dispatchEvent(new CustomEvent('queryChange', { detail: query }));
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

    const showPage = (page: PageViewModel): void => {
        if (page.editing) {
            cm = CodeMirror(
                ($cm) => {
                    $content.innerHTML = '';
                    $content.appendChild($cm);
                    $content.classList.add('content--editing');
                },
                {
                    value: page.raw,
                    mode: 'gfm',
                    theme: 'base16-light',
                    lineNumbers: true,
                    lineWrapping: false,
                    viewportMargin: Infinity,
                    keyMap: 'default',
                    dragDrop: false,
                },
            );
            $editLink.innerText = '💾';
        } else {
            $content.classList.remove('content--editing');
            $editLink.innerText = '✏️';
            $editLink.dataset.filename = page.filename;
            $content.innerHTML = `
                <div class="page">${page.html}</div>
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
        }
    };

    $editLink.addEventListener('click', () => {
        if ($editLink.innerText === '✏️') {
            window.dispatchEvent(new CustomEvent('editClick', { detail: $editLink.dataset.filename }));
        } else {
            window.dispatchEvent(
                new CustomEvent('saveClick', {
                    detail: {
                        filename: $editLink.dataset.filename,
                        content: cm?.getValue(),
                    },
                }),
            );
        }
    });

    currentPage$.subscribe((page) => showPage(page));

    search$.subscribe(({ results, query }) => {
        $searchResults.innerHTML = results.map((result) => cardHtml(result)).join('');
        contentMark.unmark();
        contentMark.mark($searchInput.value);
        searchResultsMark.unmark();
        searchResultsMark.mark(query);
    });
}
