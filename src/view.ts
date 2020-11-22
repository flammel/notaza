import { Observable } from './observable';
import Mark from 'mark.js';
import { BacklinkViewModel, BookmarkViewModel, PageViewModel, SearchViewModel, TweetViewModel } from './viewModel';
import { debounce } from './util';

function tagsHtml(tags: string[]): string {
    return tags.map((tag) => `<a href="#/${tag}.md" class="tag">${tag}</a>`).join(' ');
}

export function bookmarkHtml(bookmark: BookmarkViewModel): string {
    return `
        <div class="card">
            <div class="card__header">
                <h3 class="card__title">
                    <a href="${bookmark.url}" target="_blank" rel="noreferrer noopener">${bookmark.title}</a>
                </h3>
                <div class="card__subtitle">${bookmark.url}</div>
                <div class="card__tags">${tagsHtml(bookmark.tags)}</div>
            </div>
            <div class="card__content">${bookmark.descriptionHtml}</div>
        </div>
    `;
}

export function tweetHtml(tweet: TweetViewModel): string {
    return `
        <div class="card">
            <div class="card__header">
                <a class="card__title" href="${tweet.url}" target="_blank" rel="noreferrer noopener">@${
        tweet.userHandle
    }</a>
                <span class="card__subtitle">on ${tweet.date}</span>
                <div class="card__tags">${tagsHtml(tweet.tags)}</div>
            </div>
            <div class="card__content">${tweet.tweet.replace(/\n/g, '<br>')}</div>
            ${tweet.notesHtml.trim() === '' ? '' : `<div class="card__content">${tweet.notesHtml}</div>`}
        </div>
    `;
}

function backlinkHtml(pageWithBacklinks: BacklinkViewModel): string {
    return `
        <div class="card">
            <div class="card__header">
                <a class="card__title" href="/#/${pageWithBacklinks.filename}">${pageWithBacklinks.title}</a>
            </div>
            <div class="card__content">${pageWithBacklinks.content}</div>
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
                <a id="edit-link" target="_blank" rel="noreferrer noopener" href="">✏️</a>
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
        !($editLink instanceof HTMLAnchorElement)
    ) {
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

    currentPage$.subscribe((page) => {
        $content.innerHTML = `
            <div class="page">${page.html}</div>
            ${page.bookmarks.map((bookmark) => bookmarkHtml(bookmark)).join('')}
            ${page.tweets.map((tweet) => tweetHtml(tweet)).join('')}
            ${page.backlinks.map((backlink) => backlinkHtml(backlink)).join('')}
        `;
        if (!($content.firstElementChild?.firstElementChild instanceof HTMLHeadingElement)) {
            const $title = document.createElement('h1');
            $title.innerHTML = page.title;
            $content.firstElementChild?.insertAdjacentElement('afterbegin', $title);
        }
        document.title = 'KB | ' + page.title;
        $editLink.style.pointerEvents = page.filename.startsWith('_') ? 'none' : 'auto';
        $editLink.setAttribute('href', page.editLink);
        hideSearch();
        contentMark.unmark();
        contentMark.mark($searchInput.value);
        window.scrollTo(0, 0);
    });

    search$.subscribe(({ results, query }) => {
        $searchResults.innerHTML = results
            .map((result) => {
                if (result.type === 'bookmark') {
                    return bookmarkHtml(result.bookmark);
                } else if (result.type === 'tweet') {
                    return tweetHtml(result.tweet);
                } else {
                    return backlinkHtml(result.page);
                }
            })
            .join('');
        contentMark.unmark();
        contentMark.mark($searchInput.value);
        searchResultsMark.unmark();
        searchResultsMark.mark(query);
    });
}
