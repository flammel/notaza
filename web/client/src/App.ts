import { Page, Block, Pages, Notification, BlockId, Dispatch, PageId, AppState } from './types';
import * as actions from './actions';
import { managedViewArray, View, view } from './view';
import { htmlBuilder, replaceContent } from './html';
import { render } from './markdown';
import { autoResize } from './util';

export type AppDispatch = Dispatch<AppState, actions.AppAction>

interface SidebarItemViewState {
    page: Page;
}
function SidebarItemView(dispatch: AppDispatch, initialState: SidebarItemViewState): View<SidebarItemViewState> {
    let currentState = initialState;
    const $link = htmlBuilder('a')
        .setAttribute('href', initialState.page.url)
        .innerText(initialState.page.title)
        .addEventListener('click', (ev) => {
            ev.preventDefault();
            dispatch(actions.changeUrl(currentState.page.url));
        })
        .build();
    const update = (newState: SidebarItemViewState) => {
        if (newState.page.title !== currentState.page.title) {
            $link.innerText = newState.page.title;
        }
        if (newState.page.url !== currentState.page.url) {
            $link.setAttribute('href', newState.page.url);
        }
        currentState = newState;
    };
    return view(htmlBuilder('li').appendChild($link).build(), update);
}

interface SidebarViewState {
    pages: Pages;
}
function SidebarView(dispatch: AppDispatch): View<SidebarViewState> {
    const $list = htmlBuilder('ul').addClass('pagelist').build();
    const children = managedViewArray($list, (state: SidebarItemViewState) => SidebarItemView(dispatch, state));
    return view(htmlBuilder('div').addClass('sidebar').appendChild($list).build(), (newState) =>
        children.update(newState.pages.map((page) => ({ page, key: page.id }))),
    );
}

interface PageHeaderViewState {
    page: Page;
}
function PageHeaderView(): View<PageHeaderViewState> {
    const $title = htmlBuilder('h1').build();
    return view(htmlBuilder('div').addClass('page__header').appendChild($title).build(), (newState) => {
        if ($title.innerText !== newState.page.title) {
            $title.innerText = newState.page.title;
        }
    });
}

function makeEditor(dispatch: AppDispatch, page: Page, block: Block): HTMLTextAreaElement {
    return htmlBuilder('textarea')
        .innerText(block.content)
        .addClass('inline-editor')
        .setAttribute('rows', 1)
        .addEventListener('keydown', (ev, el) => {
            if (ev.key === 'Escape' || (ev.key === 's' && ev.ctrlKey)) {
                ev.preventDefault();
                dispatch(actions.stopEditing(page.id, block.id, el.value));
            } else if (ev.key === 'Enter' && !ev.shiftKey) {
                ev.preventDefault();
                const before = el.value.substring(0, el.selectionStart);
                const after = el.value.substring(el.selectionEnd, el.value.length);
                dispatch(actions.splitBlock(page.id, block.id, before, after));
            } else if (ev.key === 'Backspace' && el.selectionStart === 0 && el.selectionEnd === 0) {
                ev.preventDefault();
                dispatch(actions.mergeBlockWithPredecessor(page.id, block.id, el.value));
            } else if (
                ev.key === 'Delete' &&
                el.selectionStart === el.value.length &&
                el.selectionEnd === el.value.length
            ) {
                ev.preventDefault();
                dispatch(actions.mergeBlockWithSuccessor(page.id, block.id, el.value));
            } else if (ev.key === 'Tab') {
                ev.preventDefault();
                dispatch(actions.changeBlockLevel(page.id, block.id, ev.shiftKey ? -1 : 1, el.value));
            }
        })
        .addEventListener('input', (ev, el) => {
            autoResize(el);
        })
        // .addEventListener('blur', (ev, el) => {
        //     dispatch(actions.stopEditing(page.id, block.id, el.value));
        // })
        .build();
}

interface BlockViewState {
    page: Page;
    block: Block;
    editingId: BlockId | undefined;
    render: (markdown: string) => string;
}
function BlockView(dispatch: AppDispatch, initialState: BlockViewState): View<BlockViewState> {
    let currentState: Readonly<BlockViewState> = initialState;
    const $bullet = htmlBuilder('div').addClass('block__bullet').build();
    const $children = htmlBuilder('div').addClass('block__children').build();
    const $content = htmlBuilder('div')
        .addClass('block__content')
        .innerHTML(currentState.render(currentState.block.content))
        .addEventListener('click', () => {
            dispatch(actions.startEditing(currentState.block.id));
        })
        .build();
    const $block = htmlBuilder('div')
        .addClass('block')
        .data('id', currentState.block.id)
        .withChildren([$bullet, $content, $children])
        .build();
    const managedChildren = managedViewArray($children, (state: BlockViewState) => BlockView(dispatch, state));

    let $textarea: HTMLTextAreaElement | undefined;
    const update = (newState: BlockViewState, initial: boolean = false): void => {
        if (newState.block.content !== currentState.block.content) {
            $content.innerHTML = newState.render(newState.block.content);
        }
        if (newState.block.id !== currentState.block.id) {
            $block.dataset.id = newState.block.id;
        }
        if (newState.editingId === newState.block.id && !$textarea) {
            $textarea = makeEditor(dispatch, newState.page, newState.block);
            replaceContent($content, $textarea);
            autoResize($textarea);
            $textarea.setSelectionRange(-1, -1);
        }
        if (newState.editingId !== newState.block.id && $textarea) {
            $textarea = undefined;
            $content.innerHTML = newState.render(newState.block.content);
        }
        managedChildren.update(
            newState.block.children.map((child) => ({
                ...newState,
                block: child,
                key: child.id,
            })),
        );
        currentState = newState;
    };
    update(initialState, true);

    return view($block, update, currentState.block.id, undefined, () => {
        if (currentState.editingId === currentState.block.id && $textarea) {
            $textarea.focus();
        }
    });
}

interface BlocksViewState {
    page: Page;
    editingId: BlockId | undefined;
    render: (markdown: string) => string;
}
function BlocksView(dispatch: AppDispatch): View<BlocksViewState> {
    const $root = htmlBuilder('div').addClass('blocks').build();
    const children = managedViewArray($root, (state: BlockViewState) => BlockView(dispatch, state));

    return view($root, (newState) => {
        children.update(
            newState.page.block.children.map((block) => ({
                page: newState.page,
                block,
                key: block.id,
                editingId: newState.editingId,
                render: newState.render,
            })),
        );
    });
}

interface BacklinksViewState {
    page: Page;
}
function BacklinksView(): View<BacklinksViewState> {
    const $root = htmlBuilder('div').addClass('blocks', 'blocks--backlinks').build();
    return view($root, () => {});
}

interface PageViewState {
    page: Page;
    editingId: BlockId | undefined;
    render: (markdown: string) => string;
}
function PageView(dispatch: AppDispatch): View<PageViewState> {
    const header = PageHeaderView();
    const blocks = BlocksView(dispatch);
    const backlinks = BacklinksView();

    return view(
        htmlBuilder('div')
            .addClass('page')
            .withChildren([
                header.element,
                blocks.element,
                htmlBuilder('h2').innerText('Backlinks').build(),
                backlinks.element,
            ])
            .build(),
        (newState) => {
            header.update({ page: newState.page });
            blocks.update({ page: newState.page, editingId: newState.editingId, render: newState.render });
            backlinks.update({ page: newState.page });
        },
    );
}

interface NotificationViewState {
    notification: Notification;
}
function NotificationView(initialState: NotificationViewState): View<NotificationViewState> {
    const $root = htmlBuilder('div').addClass('notification').build();

    const update = (newState: NotificationViewState) => {
        $root.innerText = newState.notification.message;
        if (newState.notification.type === 'success') {
            $root.classList.remove('notification--error');
            $root.classList.add('notification--success');
        } else {
            $root.classList.add('notification--error');
            $root.classList.remove('notification--success');
        }
    };
    update(initialState);

    return view($root, update);
}

interface NotificationsViewState {
    notifications: Notification[];
}
function Notifications(): View<NotificationsViewState> {
    const $root = htmlBuilder('div').addClass('notifications').build();
    const children = managedViewArray($root, NotificationView);
    return view($root, (newState) =>
        children.update(
            newState.notifications.map((notification) => ({
                notification,
                key: notification.id,
            })),
        ),
    );
}

type AppViewState = {
    pages: Pages;
    currentPage: PageId;
    editingId: BlockId | undefined;
    notifications: Notification[];
};
export function AppView(dispatch: AppDispatch): View<AppViewState> {
    const sidebar = SidebarView(dispatch);
    const pageView = PageView(dispatch);
    const notifications = Notifications();
    document.addEventListener('click', (ev) => {
        if (ev.target instanceof HTMLAnchorElement && ev.target.classList.contains('internal')) {
            ev.preventDefault();
            dispatch(actions.changeUrl(ev.target.getAttribute('href')?.substring(2) ?? ''));
        }
    });
    return view(
        htmlBuilder('div')
            .addClass('app')
            .withChildren([sidebar.element, pageView.element, notifications.element])
            .build(),
        (newState) => {
            sidebar.update({ pages: newState.pages });
            notifications.update({ notifications: newState.notifications });
            for (const page of newState.pages) {
                if (page.id === newState.currentPage) {
                    pageView.update({
                        page,
                        editingId: newState.editingId,
                        render: (markdown: string) => render(newState, markdown),
                    });
                }
            }
        },
    );
}
