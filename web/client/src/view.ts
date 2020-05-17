export interface View<ViewState> {
    element: HTMLElement;
    update: (newState: ViewState) => any;
    destroy: () => any;
    onRender: () => any;
    key: Key | undefined;
}
export function view<ViewState>(
    element: HTMLElement,
    update: (newState: ViewState) => any,
    key?: Key,
    destroy?: () => any,
    onRender?: () => any,
): View<ViewState> {
    if (!destroy) {
        destroy = () => {
            const parent = element.parentElement;
            if (parent) {
                parent.removeChild(element);
            }
        };
    }
    if (!onRender) {
        onRender = () => {};
    }
    return {
        element,
        update,
        destroy,
        key,
        onRender,
    };
}

type Key = string;
type WithKey<T> = T & { key: Key };
interface ManagedViewArray<ViewState> {
    update: (newStates: WithKey<ViewState>[]) => void;
}
export function managedViewArray<ViewState>(
    parent: HTMLElement,
    renderer: (state: ViewState) => View<ViewState>,
): ManagedViewArray<ViewState> {
    let oldViews = new Map<Key, { idx: number; view: View<ViewState> }>();
    return {
        update(newStates) {
            const newViews = new Map<Key, { idx: number; view: View<ViewState> }>();
            let previousElement: HTMLElement | undefined;
            const insert = (newElement: HTMLElement): void => {
                if (previousElement) {
                    previousElement.insertAdjacentElement('afterend', newElement);
                } else {
                    parent.insertAdjacentElement('afterbegin', newElement);
                }
            };
            for (let newIdx = 0; newIdx < newStates.length; newIdx++) {
                const newState = newStates[newIdx];
                const key = newState.key;
                const oldEntry = oldViews.get(key);
                if (oldEntry) {
                    oldEntry.view.update(newState);
                    newViews.set(key, oldEntry);
                    if (oldEntry.idx === newIdx) {
                        previousElement = oldEntry.view.element;
                    } else {
                        insert(oldEntry.view.element);
                        previousElement = oldEntry.view.element;
                    }
                    oldEntry.view.onRender();
                } else {
                    const newView = renderer(newState);
                    newViews.set(key, { idx: newIdx, view: newView });
                    insert(newView.element);
                    previousElement = newView.element;
                    newView.onRender();
                }
            }
            for (const oldEntry of oldViews) {
                if (!newViews.has(oldEntry[0])) {
                    oldEntry[1].view.destroy();
                }
            }
            oldViews = newViews;
        },
    };
}
