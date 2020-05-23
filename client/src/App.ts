import { Page, Pages, PageId, Notification } from './types';
import { Renderer } from './Renderer';
import { Api } from './Api';
import { dateToString, dateTimeToString } from './util';

function findPage(pages: Pages, id: PageId): Page | undefined {
    for (const page of pages) {
        if (page.id === id) {
            return page;
        }
    }
    return undefined;
}

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

interface PageView {
    element: HTMLElement;
    setPage: (page: Page, editing?: boolean) => void;
}
function makePageView(renderer: Renderer, savePage: (page: Page) => Promise<Page>): PageView {
    let page: Page | undefined;
    const $page = document.createElement('div');
    $page.classList.add('page');

    const $body = document.createElement('div');

    const $edit = document.createElement('button');
    $edit.innerText = 'edit';
    $edit.classList.add('edit-button');

    const renderPage = (newPage: Page): void => {
        page = newPage;
        $page.classList.remove('page--editing');
        $body.innerHTML = '<h1>' + page.title + '</h1>' + renderer.render(page.markdown);
    };

    const startEditing = (): void => {
        const currentPage = page;
        if (currentPage) {
            const $textarea = document.createElement('textarea');
            $textarea.innerHTML = currentPage.markdown;
            $textarea.classList.add('editor');

            const $submit = document.createElement('button');
            $submit.innerText = 'save';

            const $cancel = document.createElement('button');
            $cancel.setAttribute('type', 'button');
            $cancel.innerText = 'cancel';
            $cancel.addEventListener('click', () => {
                renderPage(currentPage);
            });

            const $form = document.createElement('form');
            $form.addEventListener('submit', (event) => {
                event.preventDefault();
                const withNewContent = { ...currentPage, markdown: $textarea.value };
                savePage(withNewContent).then((newPage) => renderPage(newPage));
            });

            $form.appendChild($textarea);
            $form.appendChild($submit);
            $form.appendChild($cancel);

            $page.classList.add('page--editing');
            $body.innerHTML = '';
            $body.appendChild($form);
        }
    };

    const setPage = (newPage: Page, editing: boolean | undefined = false): void => {
        renderPage(newPage);
        if (editing) {
            startEditing();
        }
    };

    $edit.addEventListener('click', () => startEditing());

    $page.appendChild($edit);
    $page.appendChild($body);

    return {
        element: $page,
        setPage,
    };
}

interface Sidebar {
    element: HTMLElement;
}
function makeSidebar(pages$: Observable<Pages>, refreshBacklinks: () => void, goToUrl: (url: string) => void): Sidebar {
    let query = '';

    const $sidebar = document.createElement('div');
    $sidebar.classList.add('sidebar');

    const $pageList = document.createElement('ul');
    $pageList.classList.add('page-list');

    const $form = document.createElement('form');
    const $input = document.createElement('input');
    $input.setAttribute('placeholder', 'Search');
    const $today = document.createElement('a');
    $today.setAttribute('href', '/');
    $today.innerText = 'Today';
    $today.addEventListener('click', (event) => {
        event.preventDefault();
        goToUrl('/');
    });
    $form.appendChild($today);
    $form.appendChild($input);

    const makePageListItem = (page: Page, onClick: () => void): HTMLLIElement => {
        const $item = document.createElement('li');
        const $link = document.createElement('a');
        $link.setAttribute('href', page.id);
        $link.innerText = page.title;
        $link.addEventListener('click', (event) => {
            event.preventDefault();
            onClick();
        });
        $item.appendChild($link);
        return $item;
    };

    const pageSort = (a: Page, b: Page): number => {
        const aIsDate = a.title.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
        const bIsDate = a.title.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
        if (aIsDate && bIsDate) {
            return b.title.localeCompare(a.title);
        } else if (aIsDate && !bIsDate) {
            return -1;
        } else if (!aIsDate && bIsDate) {
            return 1;
        } else {
            return a.title.localeCompare(b.title);
        }
    };

    const search = (): void => {
        const $fragment = document.createDocumentFragment();
        const results = pages$
            .value()
            .filter((page) => page.title.toLowerCase().includes(query.toLowerCase()))
            .sort(pageSort);
        for (const page of results) {
            $fragment.appendChild(makePageListItem(page, () => goToUrl(page.id)));
        }
        $pageList.innerHTML = '';
        $pageList.appendChild($fragment);
    };

    pages$.subscribe(() => search());

    $form.addEventListener('submit', (event) => {
        event.preventDefault();
    });
    $input.addEventListener('input', () => {
        query = $input.value;
        search();
    });

    const $refreshBacklinks = document.createElement('button');
    $refreshBacklinks.addEventListener('click', () => refreshBacklinks());
    $refreshBacklinks.innerText = 'Refresh Backlinks';

    $sidebar.appendChild($form);
    $sidebar.appendChild($pageList);
    $sidebar.appendChild($refreshBacklinks);

    return {
        element: $sidebar,
    };
}

type Listener<T> = (value: T) => void;
interface Observable<T> {
    value: (fallback?: T) => T;
    next: (value: T) => void;
    subscribe: (listener: Listener<T>) => void;
}
function makeObservable<T>(initial: T): Observable<T> {
    let value = initial;
    const listeners: Listener<T>[] = [];
    return {
        value(): T {
            return value;
        },
        next(newValue: T): void {
            value = newValue;
            for (const listener of listeners) {
                listener(value);
            }
        },
        subscribe(listener: Listener<T>): void {
            listeners.push(listener);
            if (value) {
                listener(value);
            }
        },
    };
}

interface App {
    element: HTMLElement;
}
export function makeApp(renderer: Renderer, api: Api): App {
    const pages$ = makeObservable<Pages>([]);

    const $app = document.createElement('div');
    $app.classList.add('app');

    const notifications = makeNotifications();
    const pageView = makePageView(
        renderer,
        (page: Page): Promise<Page> => {
            return new Promise((resolve, reject) => {
                api.savePage(page)
                    .then((newPage) => {
                        notifications.add({
                            type: 'success',
                            message: 'saved',
                        });
                        pages$.next(pages$.value().map((page) => (page.id === newPage.id ? newPage : page)));

                        resolve(newPage);
                    })
                    .catch(() => {
                        notifications.add({
                            type: 'error',
                            message: 'failed',
                        });
                        reject();
                    });
            });
        },
    );

    const newPage = (url: string): Page => {
        return {
            id: url,
            markdown: `---\ntitle: ${url}\ncreated: ${dateTimeToString(new Date())}\n---\n\n# ${url}`,
            title: url,
        };
    };

    const goToUrl = (url: string): void => {
        if (url.startsWith('./')) {
            url = url.substring(2);
        }
        if (url.startsWith('/')) {
            url = url.substring(1);
        }
        if (url === '') {
            url = dateToString(new Date());
        }
        const page = findPage(pages$.value(), url);
        if (page === undefined) {
            pageView.setPage(newPage(url), true);
        } else {
            pageView.setPage(page);
        }
        window.scrollTo(0, 0);
    };

    const changeToUrl = (url: string): void => {
        window.history.pushState(undefined, url, url);
        goToUrl(url);
    };

    const sidebar = makeSidebar(
        pages$,
        () =>
            api
                .refreshBAcklinks()
                .then(() => notifications.add({ type: 'success', message: 'refreshed' }))
                .catch(() => notifications.add({ type: 'error', message: 'failed' })),
        changeToUrl,
    );

    $app.appendChild(sidebar.element);
    $app.appendChild(pageView.element);
    $app.appendChild(notifications.element);

    document.addEventListener('click', (ev) => {
        if (ev.target instanceof HTMLAnchorElement && ev.target.classList.contains('internal')) {
            ev.preventDefault();
            const href = ev.target.getAttribute('href');
            if (href) {
                changeToUrl(href);
            }
        }
    });

    window.addEventListener('popstate', () => {
        goToUrl(window.location.pathname);
    });

    api.loadPages()
        .then((loadedPages) => {
            pages$.next(loadedPages);
            goToUrl(window.location.pathname);
        })
        .catch(() => {
            notifications.add({
                type: 'error',
                message: 'load failed',
            });
        });

    return {
        element: $app,
    };
}
