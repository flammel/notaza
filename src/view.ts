import { Observable } from './observable';
import Mark from 'mark.js';

export interface BookmarkViewModel {
    url: string;
    title: string;
    date: string;
    tags: string[];
    descriptionHtml: string;
}

export interface TweetViewModel {
    url: string;
    userHandle: string;
    date: string;
    tags: string[];
    tweet: string;
    notesHtml: string;
}

export interface BacklinkViewModel {
    filename: string;
    title: string;
    backlinks: Array<{ contentHtml: string }>;
}

export interface PageViewModel {
    filename: string;
    title: string;
    html: string;
    editLink: string;
    bookmarks: BookmarkViewModel[];
    tweets: TweetViewModel[];
    backlinks: BacklinkViewModel[];
}

export interface PageTree {
    title: string;
    filename: string;
    children: PageTree[];
}

export interface SidebarViewModel {
    trees: PageTree[];
}

export type SearchResult =
    | { type: 'bookmark'; bookmark: BookmarkViewModel }
    | { type: 'tweet'; tweet: TweetViewModel }
    | { type: 'page'; page: BacklinkViewModel };

export interface SearchViewModel {
    query: string;
    results: SearchResult[];
}

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
    for (const backlink of pageWithBacklinks.backlinks) {
        const $backlink = document.createElement('div');
        $backlink.innerHTML = backlink.contentHtml;
        $container.appendChild($backlink);
    }
    return $container;
}

function renderBacklinks(backlinks: BacklinkViewModel[]): Node {
    const $fragment = document.createDocumentFragment();

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

    const $editLink = document.createElement('a');
    $editLink.setAttribute('href', page.editLink);
    $editLink.setAttribute('target', '_blank');
    $editLink.setAttribute('rel', 'noreferrer noopener');
    $editLink.innerText = 'edit';
    $page.appendChild($editLink);

    $page.appendChild(renderBookmarks(page.bookmarks));
    $page.appendChild(renderTweets(page.tweets));
    $page.appendChild(renderBacklinks(page.backlinks));

    return $page;
}

function renderTree(tree: PageTree): HTMLElement {
    const $item = document.createElement('li');
    $item.classList.add('sidebar__item');

    const $link = document.createElement('a');
    $link.classList.add('sidebar__link');
    $link.setAttribute('href', '/#/' + tree.filename);
    $link.innerHTML = tree.title;
    $item.appendChild($link);

    if (tree.children.length > 0) {
        const $opener = document.createElement('span');
        $opener.classList.add('sidebar__item-opener');
        $opener.innerText = '+';
        $opener.addEventListener('click', () => {
            $item.classList.toggle('sidebar__item--open');
        });
        $item.appendChild($opener);

        const $children = document.createElement('ul');
        $children.classList.add('sidebar__list');
        for (const child of tree.children) {
            $children.appendChild(renderTree(child));
        }
        $item.appendChild($children);
    }

    return $item;
}

function renderContent(page$: Observable<PageViewModel>): HTMLElement {
    const $content = document.createElement('div');
    $content.classList.add('content');

    page$.subscribe((page) => {
        $content.innerHTML = '';
        $content.appendChild(renderPage(page));
        document.title = 'KB | ' + page.title;
    });

    return $content;
}

function renderSidebar(sidebar$: Observable<SidebarViewModel>, currentPage$: Observable<PageViewModel>): HTMLElement {
    const $sidebar = document.createElement('div');
    $sidebar.classList.add('sidebar');

    const $form = document.createElement('form');
    $form.classList.add('sidebar__header');
    $form.addEventListener('submit', (event) => event.preventDefault());

    const $search = document.createElement('input');
    $search.classList.add('sidebar__search-input');
    $search.setAttribute('placeholder', 'Search');
    $search.addEventListener('input', () => {
        window.dispatchEvent(new CustomEvent('queryChange', { detail: $search.value }));
    });
    $search.addEventListener('focus', () => {
        document.querySelector('.app')?.classList.add('-searching');
    });
    document.addEventListener('mouseup', (event) => {
        if (event.target !== $search && window.getSelection()?.isCollapsed) {
            document.querySelector('.app')?.classList.remove('-searching');
        }
    });

    const $results = document.createElement('ul');
    $results.classList.add('sidebar__list', 'sidebar__list--root');

    sidebar$.subscribe((sidebar) => {
        const $container = document.createDocumentFragment();
        for (const tree of sidebar.trees) {
            $container.appendChild(renderTree(tree));
        }
        $results.innerHTML = '';
        $results.appendChild($container);
    });

    currentPage$.subscribe((page) => {
        $results.querySelector('.active')?.classList.remove('active');
        const activeItem = $results.querySelector('a[href="/#/' + page.filename + '"]');
        if (activeItem) {
            activeItem.classList.add('active');
            let parent: Element | null | undefined = activeItem;
            while ((parent = parent.parentElement?.closest('.sidebar__item'))) {
                parent.classList.add('sidebar__item--open');
            }
        }
    });

    $form.appendChild($search);
    $sidebar.appendChild($form);
    $sidebar.appendChild($results);

    return $sidebar;
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

    const mark = new Mark($search);

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

export function mountView(
    $container: HTMLElement,
    currentPage$: Observable<PageViewModel>,
    sidebar$: Observable<SidebarViewModel>,
    search$: Observable<SearchViewModel>,
): void {
    const $app = document.createElement('div');
    $app.classList.add('app');
    $app.appendChild(renderSidebar(sidebar$, currentPage$));
    $app.appendChild(renderContent(currentPage$));
    $app.appendChild(renderSearch(search$));
    $container.appendChild($app);
}
