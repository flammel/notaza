import { Page, Pages, Notification } from './types';
import { Renderer } from './Renderer';
import { dateToString, dateTimeToString } from './util';
import * as Bacon from 'baconjs';

interface Notifications {
    element: HTMLElement;
    add: (notification: Notification) => void;
}
function makeNotifications(): Notifications {
    const $notifications = document.createElement('div');
    $notifications.classList.add('notifications');
    return {
        element: $notifications,
        add: (notification: Notification): void => {
            const $notification = document.createElement('div');
            $notification.classList.add('notification');
            $notification.innerText = notification.message;
            $notification.classList.add(
                notification.type === 'error' ? 'notification--error' : 'notification--success',
            );
            $notifications.appendChild($notification);
            setTimeout(() => {
                $notifications.removeChild($notification);
            }, 3000);
        },
    };
}

interface PageViewState {
    page: Page;
    editing: boolean;
}
interface PageView {
    element: HTMLElement;
}
function makePageView(
    renderer: Renderer,
    state$: Bacon.Observable<PageViewState>,
    savePage: (page: Page) => void,
): PageView {
    // Elements

    const $page = document.createElement('div');
    $page.classList.add('page');

    // Helpers

    const renderForm = (page: Page, stopEditing: () => void): void => {
        const $textarea = document.createElement('textarea');
        $textarea.innerHTML = page.markdown;
        $textarea.classList.add('editor');

        const $submit = document.createElement('button');
        $submit.innerText = 'save';

        const $cancel = document.createElement('button');
        $cancel.setAttribute('type', 'button');
        $cancel.innerText = 'cancel';
        $cancel.addEventListener('click', () => {
            stopEditing();
        });

        const $form = document.createElement('form');
        $form.addEventListener('submit', (event) => {
            event.preventDefault();
            const withNewContent = { ...page, markdown: $textarea.value };
            savePage(withNewContent);
        });

        $form.appendChild($textarea);
        $form.appendChild($submit);
        $form.appendChild($cancel);

        $page.innerHTML = '';
        $page.appendChild($form);
    };

    const renderView = (page: Page): void => {
        const $edit = document.createElement('button');
        $edit.innerText = 'edit';
        $edit.classList.add('edit-button');
        $edit.addEventListener('click', () => renderForm(page, () => renderView(page)));

        $page.innerHTML = '<h1>' + page.title + '</h1>' + renderer.render(page.markdown);
        $page.appendChild($edit);
    };

    // Observables

    state$.onValue((state) => {
        if (state.editing) {
            renderForm(state.page, () => renderView(state.page));
        } else {
            renderView(state.page);
        }
    });

    // Result

    return {
        element: $page,
    };
}

function resultSort(a: SearchResult, b: SearchResult): number {
    const aIsDate = a.page.title.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
    const bIsDate = b.page.title.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
    if (aIsDate && bIsDate) {
        return b.page.title.localeCompare(a.page.title);
    } else if (aIsDate && !bIsDate) {
        return -1;
    } else if (!aIsDate && bIsDate) {
        return 1;
    } else {
        return a.page.title.localeCompare(b.page.title);
    }
}

function makePageListItem(result: SearchResult, onClick: () => void): HTMLLIElement {
    const $link = document.createElement('a');
    $link.setAttribute('href', result.page.id);
    $link.innerText = result.page.title;
    $link.addEventListener('click', (event) => {
        event.preventDefault();
        onClick();
    });

    const $matches = document.createElement('ul');
    for (const match of result.matches || []) {
        const $match = document.createElement('li');
        $match.classList.add('search-result__match');
        const idx = match.toLowerCase().indexOf(result.query.toLowerCase());
        $match.appendChild(document.createTextNode(match.substring(0, idx)));
        const $mark = document.createElement('mark');
        $mark.innerText = match.substring(idx, idx + result.query.length);
        $match.appendChild($mark);
        $match.appendChild(document.createTextNode(match.substring(idx + result.query.length)));
        $matches.appendChild($match);
    }

    const $item = document.createElement('li');
    $item.classList.add('search-result');
    $item.appendChild($link);
    $item.appendChild($matches);
    $item.addEventListener('click', (event) => {
        event.preventDefault();
        onClick();
    });

    return $item;
}

function matchPage(page: Page, query: string): SearchResult {
    const matches = page.searchable.filter((line) => line.toLowerCase().includes(query.toLowerCase()));
    return {
        page,
        query,
        matches:
            query === ''
                ? []
                : matches.length > 0 || page.title.toLowerCase().includes(query.toLowerCase())
                ? matches
                : undefined,
    };
}

interface SearchResult {
    page: Page;
    query: string;
    matches: string[] | undefined;
}

interface Sidebar {
    element: HTMLElement;
}
function makeSidebar(
    pages$: Bacon.Observable<Pages>,
    refreshBacklinks: () => void,
    goToUrl: (url: string) => void,
): Sidebar {
    // Elements

    const $pageList = document.createElement('ul');
    $pageList.classList.add('page-list');

    const $input = document.createElement('input');
    $input.setAttribute('placeholder', 'Search');

    const $today = document.createElement('a');
    $today.setAttribute('href', '/');
    $today.innerText = 'Today';
    $today.addEventListener('click', (event) => {
        event.preventDefault();
        goToUrl('/');
    });

    const $form = document.createElement('form');
    $form.addEventListener('submit', (event) => {
        event.preventDefault();
    });
    $form.appendChild($today);
    $form.appendChild($input);

    const $refreshBacklinks = document.createElement('button');
    $refreshBacklinks.addEventListener('click', () => refreshBacklinks());
    $refreshBacklinks.innerText = 'Refresh Backlinks';

    const $sidebar = document.createElement('div');
    $sidebar.classList.add('sidebar');
    $sidebar.appendChild($form);
    $sidebar.appendChild($pageList);
    $sidebar.appendChild($refreshBacklinks);

    // Observables

    const query$ = Bacon.fromBinder<string>((sink) => {
        $input.addEventListener('input', () => {
            sink($input.value);
        });
        sink('');
        return (): undefined => undefined;
    });
    const results$ = Bacon.combine(query$, pages$, (query: string, pages: Pages): SearchResult[] => {
        return pages
            .map((page) => matchPage(page, query))
            .filter((result) => result.matches !== undefined)
            .sort(resultSort);
    });
    results$.onValue((results) => {
        const $fragment = document.createDocumentFragment();
        for (const result of results) {
            $fragment.appendChild(makePageListItem(result, () => goToUrl(result.page.id)));
        }
        $pageList.innerHTML = '';
        $pageList.appendChild($fragment);
    });

    // Result

    return {
        element: $sidebar,
    };
}

function findPage(url: string, pages: Pages): Page | undefined {
    for (const page of pages) {
        if (page.id === url) {
            return page;
        }
    }
    return undefined;
}

function newPage(url: string): Page {
    const id = url === '/' || url === '' ? dateToString(new Date()) : url;
    return {
        id: id,
        markdown: `---\ntitle: ${id}\ncreated: ${dateTimeToString(new Date())}\n---\n\n* `,
        title: id,
        searchable: [],
    };
}

function cleanUrl(rawUrl: string): string {
    if (rawUrl.startsWith('/')) {
        return rawUrl.substring(1);
    } else if (rawUrl.startsWith('./')) {
        return rawUrl.substring(2);
    } else {
        return rawUrl;
    }
}

interface App {
    element: HTMLElement;
}
export function makeApp(
    renderer: Renderer,
    pages$: Bacon.Observable<Pages>,
    savePage: (page: Page, notify: (notification: Notification) => void) => void,
    refreshBacklinks: (notify: (notification: Notification) => void) => void,
): App {
    // Observables

    const rawUrl$ = new Bacon.Bus<string>();
    const url$ = rawUrl$.toProperty(window.location.pathname).map(cleanUrl).skipDuplicates();
    url$.onValue((url) => {
        if (cleanUrl(window.location.pathname) !== url) {
            if (url === '') {
                url = '/';
            }
            window.history.pushState(null, url, url);
        }
    });

    const pageFromUrl$ = Bacon.combine(
        url$,
        pages$,
        (url, pages): PageViewState => {
            const page = findPage(url, pages);
            if (page) {
                return { page, editing: false };
            } else {
                return { page: newPage(url), editing: true };
            }
        },
    );

    // Components

    const notifications = makeNotifications();
    const pageView = makePageView(renderer, pageFromUrl$, (page) => savePage(page, notifications.add));

    const sidebar = makeSidebar(
        pages$,
        () => refreshBacklinks(notifications.add),
        (url) => rawUrl$.push(url),
    );

    // Elements

    const $app = document.createElement('div');
    $app.classList.add('app');
    $app.appendChild(sidebar.element);
    $app.appendChild(pageView.element);
    $app.appendChild(notifications.element);

    // Global event handlers

    document.addEventListener('click', (event) => {
        if (event.target instanceof HTMLAnchorElement && event.target.classList.contains('internal')) {
            event.preventDefault();
            const href = event.target.getAttribute('href');
            if (href) {
                rawUrl$.push(href);
            }
        }
    });

    window.addEventListener('popstate', () => {
        rawUrl$.push(window.location.pathname);
    });

    // Result

    return {
        element: $app,
    };
}
