import { Observable } from './observable';
import Mark from 'mark.js';
import { BacklinkViewModel, BookmarkViewModel, PageViewModel, SearchViewModel, TweetViewModel } from './viewModel';
import { debounce } from './util';

function tagsHtml(tags: string[]): string {
    return tags.map((tag) => `<a href="#/${tag}.md">${tag}</a>`).join(' ');
}

function bookmarkHtml(bookmark: BookmarkViewModel): string {
    return `
        <div class="bookmark">
            <h3 class="bookmark__title">
                <a href="${bookmark.url}" target="_blank" rel="noreferrer noopener">${bookmark.title}</a>
            </h3>
            <div class="bookmark__url">${bookmark.url}</div>
            <div class="bookmark__tags">${tagsHtml(bookmark.tags)}</div>
            <div class="bookmark__description">${bookmark.descriptionHtml}</div>
        </div>
    `;
}

function bookmarksHtml(bookmarks: BookmarkViewModel[]): string {
    return `
        <div class="bookmarks">
            <h2>Bookmarks</h2>
            ${bookmarks.map((bookmark) => bookmarkHtml(bookmark)).join('')}
        </div>
    `;
}

function tweetHtml(tweet: TweetViewModel): string {
    return `
        <div class="tweet">
            <div class="tweet__header">
                <a href="${tweet.url}" target="_blank" rel="noreferrer noopener">@${tweet.userHandle}</a>
                <span class="tweet__date">on ${tweet.date}</span>
            </div>
            <div class="tweet__tags">${tagsHtml(tweet.tags)}</div>
            <div class="tweet__tweet">${tweet.tweet.replace(/\n/g, '<br>')}</div>
            <div class="tweet__notes">${tweet.notesHtml}</div>
        </div>
    `;
}

function tweetsHtml(tweets: TweetViewModel[]): string {
    return `
        <div class="tweets">
            <h2>Tweets</h2>
            ${tweets.map((tweet) => tweetHtml(tweet)).join('')}
        </div>
    `;
}

function backlinkHtml(pageWithBacklinks: BacklinkViewModel): string {
    return `
        <div class="reference">
            <h3>
                <a href="/#/${pageWithBacklinks.filename}">${pageWithBacklinks.title}</a>
            </h3>
            <div>${pageWithBacklinks.content}</div>
        </div>
    `;
}

function backlinksHtml(backlinks: BacklinkViewModel[]): string {
    return `
        <div class="backlinks">
            <h2>Backlinks</h2>
            ${backlinks.map((backlink) => backlinkHtml(backlink)).join('')}
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
            ${page.bookmarks.length > 0 ? bookmarksHtml(page.bookmarks) : ''}
            ${page.tweets.length > 0 ? tweetsHtml(page.tweets) : ''}
            ${page.backlinks.length > 0 ? backlinksHtml(page.backlinks) : ''}
        `;
        if (!($content.firstElementChild?.firstElementChild instanceof HTMLHeadingElement)) {
            const $title = document.createElement('h1');
            $title.innerHTML = page.title;
            $content.firstElementChild?.insertAdjacentElement('afterbegin', $title);
        }
        document.title = 'KB | ' + page.title;
        $editLink.setAttribute('href', page.editLink);
        hideSearch();
        contentMark.unmark();
        contentMark.mark($searchInput.value);
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
