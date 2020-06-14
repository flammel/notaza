import * as Bacon from 'baconjs';
import { dateToString, dateTimeToString } from '../util';
import { makeNotifications } from './Notifications';
import { makeSidebar } from './Sidebar';
import { makePageView } from './Page';
function findPage(id, pages) {
    for (const page of pages) {
        if (page.id === id) {
            return page;
        }
    }
    return undefined;
}
function newPage(id) {
    const now = new Date();
    id = id === '' ? dateToString(now) : id;
    return {
        id: id,
        title: id,
        created: dateTimeToString(now),
        blocks: [{ content: '', children: [] }],
    };
}
export function makeApp(pages$, route$, renderPage, savePage) {
    // Observables
    const notifications$ = new Bacon.Bus();
    const pageViewState$ = route$.combine(pages$, (route, pages) => {
        const found = findPage(route.pageId, pages);
        if (found) {
            return { page: found, editing: false };
        }
        else {
            return { page: newPage(route.pageId), editing: true };
        }
    });
    // Helpers
    const notify = (notification) => notifications$.push(notification);
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
//# sourceMappingURL=App.js.map