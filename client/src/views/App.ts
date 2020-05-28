import { Page, Pages, Notification, Route } from '../types';
import * as Bacon from 'baconjs';
import { dateToString, dateTimeToString } from '../util';
import { makeNotifications } from './Notifications';
import { makeSidebar } from './Sidebar';
import { makePageView } from './Page';

function findPage(id: string, pages: Pages): Page | undefined {
    for (const page of pages) {
        if (page.id === id) {
            return page;
        }
    }
    return undefined;
}

function newPage(id: string): Page {
    id = id === '' ? dateToString(new Date()) : id;
    return {
        id: id,
        markdown: `---\ntitle: ${id}\ncreated: ${dateTimeToString(new Date())}\n---\n\n* `,
        title: id,
        searchable: [],
    };
}

interface App {
    element: HTMLElement;
}
export function makeApp(
    pages$: Bacon.Observable<Pages>,
    route$: Bacon.Observable<Route>,
    renderPage: (page: Page) => string,
    savePage: (page: Page, notify: (notification: Notification) => void) => void,
): App {
    // Observables

    const notifications$ = new Bacon.Bus<Notification>();
    const pageViewState$ = route$.combine(pages$, (route, pages) => {
        const found = findPage(route.pageId, pages);
        if (found) {
            return { page: found, editing: false };
        } else {
            return { page: newPage(route.pageId), editing: true };
        }
    });

    // Helpers

    const notify = (notification: Notification): void => notifications$.push(notification);

    // Components

    const notifications = makeNotifications(notifications$);
    const sidebar = makeSidebar(pages$);
    const pageView = makePageView(pageViewState$, renderPage, (page) => savePage(page, notify));

    // Elements

    const $app = document.createElement('div');
    $app.classList.add('app');
    $app.appendChild(sidebar.element);
    $app.appendChild(pageView.element);
    $app.appendChild(notifications.element);

    // Result

    return {
        element: $app,
    };
}
