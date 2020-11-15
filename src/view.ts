import { Observable } from './observable';
import Mark from 'mark.js';
import { BacklinkViewModel, BookmarkViewModel, PageViewModel, SearchViewModel, TweetViewModel } from './viewModel';
import { debounce } from './util';

function renderBookmark(bookmark: BookmarkViewModel): Node {
    const $container = document.createElement('div');
    $container.classList.add('bookmark');
    const $title = document.createElement('h3');
    $title.classList.add('bookmark__title');
    const $link = document.createElement('a');
    $link.setAttribute('href', bookmark.url);
    $link.setAttribute('target', '_blank');
    $link.setAttribute('rel', 'noreferrer noopener');
    $link.innerText = bookmark.title;
    $title.appendChild($link);

    const $url = document.createElement('div');
    $url.classList.add('bookmark__url');
    $url.innerText = bookmark.url;

    const $tags = document.createElement('div');
    $tags.classList.add('bookmark__tags');
    $tags.innerHTML = bookmark.tags.map((tag) => `<a href="#/${tag}.md">${tag}</a>`).join(' ');

    const $description = document.createElement('div');
    $description.classList.add('bookmark__description');
    $description.innerHTML = bookmark.descriptionHtml;

    $container.appendChild($title);
    $container.appendChild($url);
    $container.appendChild($tags);
    $container.appendChild($description);

    return $container;
}

function renderBookmarks(bookmarks: BookmarkViewModel[]): Node {
    const $fragment = document.createDocumentFragment();

    if (bookmarks.length < 1) {
        return $fragment;
    }

    const $headline = document.createElement('h2');
    $headline.innerText = 'Bookmarks';
    $fragment.appendChild($headline);

    for (const bookmark of bookmarks) {
        $fragment.appendChild(renderBookmark(bookmark));
    }

    return $fragment;
}

function renderTweet(tweet: TweetViewModel): Node {
    const $container = document.createElement('div');
    $container.classList.add('tweet');

    const $header = document.createElement('div');
    $header.classList.add('tweet__header');

    const $link = document.createElement('a');
    $link.setAttribute('href', tweet.url);
    $link.setAttribute('target', '_blank');
    $link.setAttribute('rel', 'noreferrer noopener');
    $link.innerText = '@' + tweet.userHandle;
    $header.appendChild($link);

    const $date = document.createElement('span');
    $date.classList.add('tweet__date');
    $date.innerText = ' on ' + tweet.date;
    $header.appendChild($date);

    const $tags = document.createElement('div');
    $tags.classList.add('tweet__tags');
    $tags.innerHTML = tweet.tags.map((tag) => `<a href="#/${tag}.md">${tag}</a>`).join(' ');

    const $tweet = document.createElement('div');
    $tweet.classList.add('tweet__tweet');
    $tweet.innerHTML = tweet.tweet.replace(/\n/g, '<br>');

    const $notes = document.createElement('div');
    $notes.classList.add('tweet__notes');
    $notes.innerHTML = tweet.notesHtml;

    $container.appendChild($header);
    $container.appendChild($tags);
    $container.appendChild($tweet);
    $container.appendChild($notes);

    return $container;
}

function renderTweets(tweets: TweetViewModel[]): Node {
    const $fragment = document.createDocumentFragment();

    if (tweets.length < 1) {
        return $fragment;
    }

    const $headline = document.createElement('h2');
    $headline.innerText = 'Tweets';
    $fragment.appendChild($headline);

    for (const tweet of tweets) {
        $fragment.appendChild(renderTweet(tweet));
    }

    return $fragment;
}

function renderBacklink(pageWithBacklinks: BacklinkViewModel): Node {
    const $container = document.createElement('div');
    $container.classList.add('reference');
    const $title = document.createElement('h3');
    const $link = document.createElement('a');
    $link.setAttribute('href', '/#/' + pageWithBacklinks.filename);
    $link.innerText = pageWithBacklinks.title;
    $title.appendChild($link);
    $container.appendChild($title);
    const $block = document.createElement('div');
    $block.innerHTML = pageWithBacklinks.content;
    $container.appendChild($block);
    return $container;
}

function renderBacklinks(backlinks: BacklinkViewModel[]): Node {
    const $fragment = document.createDocumentFragment();

    if (backlinks.length < 1) {
        return $fragment;
    }

    const $headline = document.createElement('h2');
    $headline.innerText = 'References';
    $fragment.appendChild($headline);

    for (const backlink of backlinks) {
        $fragment.appendChild(renderBacklink(backlink));
    }

    return $fragment;
}

function renderPage(page: PageViewModel): HTMLElement {
    const $page = document.createElement('div');
    $page.classList.add('page');

    $page.innerHTML = page.html;
    if (!($page.firstChild instanceof HTMLHeadingElement)) {
        const $title = document.createElement('h1');
        $title.innerHTML = page.title;
        $page.insertBefore($title, $page.firstChild);
    }

    $page.appendChild(renderBookmarks(page.bookmarks));
    $page.appendChild(renderTweets(page.tweets));
    $page.appendChild(renderBacklinks(page.backlinks));

    return $page;
}

const editLinkId = 'edit-link';

function renderContent(page$: Observable<PageViewModel>): HTMLElement {
    const $content = document.createElement('div');
    $content.classList.add('content');
    const mark = new Mark($content);

    page$.subscribe((page) => {
        $content.innerHTML = '';
        $content.appendChild(renderPage(page));
        document.title = 'KB | ' + page.title;
        document.getElementById(editLinkId)?.setAttribute('href', page.editLink);
        hideSearch();
        mark.mark(getQuery());
    });

    return $content;
}

function getQuery(): string {
    const input = document.querySelector('.sidebar__search-input');
    if (input instanceof HTMLInputElement) {
        return input.value;
    }
    return '';
}

function hideSearch(): void {
    document.querySelector('.app')?.classList.remove('-searching');
}

function renderSearch(search$: Observable<SearchViewModel>): Node {
    const $search = document.createElement('div');
    $search.classList.add('search');

    const $headline = document.createElement('h1');
    $headline.innerText = 'Search';
    $search.appendChild($headline);

    const $results = document.createElement('div');
    $results.classList.add('results');
    $search.appendChild($results);

    const mark = new Mark($results);

    search$.subscribe(({ results, query }) => {
        const $fragment = document.createDocumentFragment();

        for (const result of results) {
            if (result.type === 'bookmark') {
                $fragment.appendChild(renderBookmark(result.bookmark));
            } else if (result.type === 'tweet') {
                $fragment.appendChild(renderTweet(result.tweet));
            } else {
                $fragment.appendChild(renderBacklink(result.page));
            }
        }

        $results.innerHTML = '';
        $results.appendChild($fragment);

        mark.mark(query);
    });

    return $search;
}

const debouncedQueryChangeHandler = debounce((query: string) => {
    window.dispatchEvent(new CustomEvent('queryChange', { detail: query }));
}, 50);

function renderHeader(): HTMLElement {
    const $header = document.createElement('div');
    $header.classList.add('header');

    const $home = document.createElement('a');
    $home.setAttribute('href', '/#/');
    $home.innerText = '🏠';
    $header.appendChild($home);

    const $index = document.createElement('a');
    $index.setAttribute('href', '/#/_index.md');
    $index.innerText = '📁';
    $header.appendChild($index);

    const $edit = document.createElement('a');
    $edit.id = editLinkId;
    $edit.innerText = '✏️';
    $edit.setAttribute('target', '_blank');
    $edit.setAttribute('rel', 'noreferrer noopener');
    $header.appendChild($edit);

    const $search = document.createElement('input');
    $search.setAttribute('placeholder', 'Search');
    $header.appendChild($search);

    $search.addEventListener('input', () => debouncedQueryChangeHandler($search.value));
    $search.addEventListener('focus', () => {
        document.querySelector('.app')?.classList.add('-searching');
    });
    document.addEventListener('click', (event) => {
        if (event.target instanceof HTMLElement) {
            if (event.target === $search || event.target.closest('.search') !== null) {
                return;
            }
        }
        hideSearch();
    });

    return $header;
}

export function mountView(
    $container: HTMLElement,
    currentPage$: Observable<PageViewModel>,
    search$: Observable<SearchViewModel>,
): void {
    const $app = document.createElement('div');
    $app.classList.add('app');
    $app.appendChild(renderHeader());
    $app.appendChild(renderContent(currentPage$));
    $app.appendChild(renderSearch(search$));
    $container.appendChild($app);
}
