import { Observable, OperatorFunction } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { makeNotificationsView, NotificationsViewState } from './Notifications';
import { makeSidebarView, SidebarViewState } from './Sidebar';
import { makePageView, PageViewState } from './Page';
import { CommandBus } from '../commandBus';
import { AppState, Page, Pages } from '../types';
import { dateToString, dateTimeToString } from '../util';
import * as _ from 'lodash';
import { Store } from '../store/store';

function selectNotificationsState(state: AppState): NotificationsViewState {
    return {
        notifications: state.notifications,
    };
}

function selectSidebarState(state: AppState): SidebarViewState {
    return {
        query: state.query,
        results: state.pages
            .filter((page) => page.title.toLowerCase().includes(state.query.toLowerCase()))
            .map((page) => ({
                title: page.title,
                url: page.id,
                matches: [],
            })),
    };
}

function findPage(id: string, pages: Pages): Page | undefined {
    for (const page of pages) {
        if (page.id === id) {
            return page;
        }
    }
    return undefined;
}

function newPage(id: string): Page {
    const now = new Date();
    id = id === '' ? dateToString(now) : id;
    return {
        id: id,
        title: id,
        created: dateTimeToString(now),
        blocks: [{ content: '', children: [] }],
    };
}

function selectPageState(state: AppState): PageViewState {
    const page = findPage(state.urlId, state.pages) || newPage(state.urlId);
    return {
        page,
        editing: state.editing,
    };
}

function selectDistinct<T, R>(select: (input: T) => R): OperatorFunction<T, R> {
    return (input$): Observable<R> =>
        input$.pipe(
            map(select),
            distinctUntilChanged((a, b) => _.isEqual(a, b)),
        );
}

interface App {
    element: HTMLElement;
}
export function makeApp(store: Store<AppState>): App {
    const notifications = makeNotificationsView(store.select(selectNotificationsState));
    const sidebar = makeSidebarView(
        store.select(selectSidebarState),
        store.dispatch
    );
    const pageView = makePageView(
        store.select(selectPageState),
        store.dispatch
    );

    const $app = document.createElement('div');
    $app.classList.add('app');
    $app.appendChild(sidebar.element);
    $app.appendChild(pageView.element);
    $app.appendChild(notifications.element);

    return {
        element: $app,
    };
}
