import { Page, Pages, PageId, Notification } from './types';
import { Renderer } from './Renderer';
import { Api } from './Api';
import { dateToString } from './util';

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
function makePageView(renderer: Renderer, savePage: (page: Page) => Promise<void>): PageView {
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
        $body.innerHTML = renderer.render(page.markdown);
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
                savePage(withNewContent).then(() => renderPage(withNewContent));
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
    setPages: (pages: Pages) => void;
}
function makeSidebar(goToPage: (page: Page) => void): Sidebar {
    let allPages: Pages = [];
    let query = '';

    const $sidebar = document.createElement('div');
    $sidebar.classList.add('sidebar');

    const $pageList = document.createElement('ul');
    $pageList.classList.add('page-list');

    const $form = document.createElement('form');
    const $input = document.createElement('input');
    $input.setAttribute('placeholder', 'Search');

    $form.appendChild($input);

    const makePageListItem = (page: Page, goToPage: (page: Page) => void): HTMLLIElement => {
        const $item = document.createElement('li');
        const $link = document.createElement('a');
        $link.setAttribute('href', page.id);
        $link.innerText = page.title;
        $link.addEventListener('click', (event) => {
            event.preventDefault();
            goToPage(page);
        });
        $item.appendChild($link);
        return $item;
    };

    const updatePageList = (pages: Pages, goToPage: (page: Page) => void): void => {
        const $fragment = document.createDocumentFragment();
        for (const page of pages) {
            $fragment.appendChild(makePageListItem(page, goToPage));
        }
        $pageList.innerHTML = '';
        $pageList.appendChild($fragment);
    };

    const search = (): Pages => {
        return allPages.filter((page) => page.title.toLowerCase().includes(query.toLowerCase()));
    };

    $form.addEventListener('submit', (event) => {
        event.preventDefault();
    });
    $input.addEventListener('input', () => {
        query = $input.value;
        updatePageList(search(), goToPage);
    });

    $sidebar.appendChild($form);
    $sidebar.appendChild($pageList);

    return {
        element: $sidebar,
        setPages: (pages: Pages): void => {
            allPages = pages;
            updatePageList(search(), goToPage);
        },
    };
}

interface App {
    element: HTMLElement;
}
export function makeApp(renderer: Renderer, api: Api): App {
    let pages: Pages = [];

    const $app = document.createElement('div');
    $app.classList.add('app');

    const notifications = makeNotifications();
    const pageView = makePageView(
        renderer,
        (page: Page): Promise<void> => {
            return new Promise((resolve, reject) => {
                api.savePage(page)
                    .then(() => {
                        notifications.add({
                            type: 'success',
                            message: 'saved',
                        });
                        resolve();
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
            markdown: `---\ntitle: ${url}\ncreated: ${new Date()
                .toISOString()
                .replace('T', ' ')
                .substring(0, 16)}\n---\n\n# ${url}`,
            title: url,
        };
    };

    const navigateToUrl = (url: string): void => {
        window.history.pushState(undefined, url, url);
        const page = findPage(pages, url);
        if (page === undefined) {
            pageView.setPage(newPage(url), true);
        } else {
            pageView.setPage(page);
        }
        window.scrollTo(0, 0);
    };

    const sidebar = makeSidebar((page: Page) => navigateToUrl(page.id));

    $app.appendChild(sidebar.element);
    $app.appendChild(pageView.element);
    $app.appendChild(notifications.element);

    document.addEventListener('click', (ev) => {
        if (ev.target instanceof HTMLAnchorElement && ev.target.classList.contains('internal')) {
            ev.preventDefault();
            navigateToUrl(ev.target.getAttribute('href')?.substring(2) || '');
        }
    });

    api.loadPages()
        .then((loadedPages) => {
            pages = loadedPages;
            sidebar.setPages(loadedPages);
            let url = window.location.pathname.substring(1);
            if (url === '') {
                url = dateToString(new Date());
            }
            const page = findPage(pages, url);
            if (page) {
                pageView.setPage(page);
            } else {
                pageView.setPage(newPage(url), true);
            }
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
