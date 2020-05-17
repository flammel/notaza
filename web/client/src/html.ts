export interface HTMLBuilder<T extends HTMLElement> {
    addClass: (...classNames: (string | undefined | null | boolean)[]) => HTMLBuilder<T>;
    setAttribute: (key: string, value: string | number) => HTMLBuilder<T>;
    appendChild: (child: Node) => HTMLBuilder<T>;
    withChildren: (children: (Node | undefined)[]) => HTMLBuilder<T>;
    innerHTML: (html: string) => HTMLBuilder<T>;
    innerText: (text: string) => HTMLBuilder<T>;
    addEventListener: <E extends keyof HTMLElementEventMap>(
        type: E,
        listener: (ev: HTMLElementEventMap[E], el: T) => void,
    ) => HTMLBuilder<T>;
    apply: (fn: (t: T) => void) => HTMLBuilder<T>;
    data: (key: string, value: string) => HTMLBuilder<T>;
    build: () => T;
}

function internalBuilder<E extends HTMLElement>(element: E): HTMLBuilder<E> {
    const internalElement = element;
    return {
        addClass(...classNames): HTMLBuilder<E> {
            for (const name of classNames) {
                if (typeof name === 'string' && name !== '') {
                    internalElement.classList.add(name);
                }
            }
            return this;
        },
        setAttribute(key, value): HTMLBuilder<E> {
            internalElement.setAttribute(key, value.toString());
            return this;
        },
        appendChild(child): HTMLBuilder<E> {
            internalElement.appendChild(child);
            return this;
        },
        withChildren(children): HTMLBuilder<E> {
            for (const child of children) {
                if (child) {
                    internalElement.appendChild(child);
                }
            }
            return this;
        },
        innerHTML(html): HTMLBuilder<E> {
            internalElement.innerHTML = html;
            return this;
        },
        innerText(text): HTMLBuilder<E> {
            internalElement.innerText = text;
            return this;
        },
        addEventListener(type, listener): HTMLBuilder<E> {
            internalElement.addEventListener(type, (ev) => listener(ev, internalElement));
            return this;
        },
        apply(fn): HTMLBuilder<E> {
            fn(internalElement);
            return this;
        },
        data(key, value): HTMLBuilder<E> {
            internalElement.dataset[key] = value;
            return this;
        },
        build(): E {
            return internalElement;
        },
    };
}

export function htmlBuilder<T extends keyof HTMLElementTagNameMap>(tag: T): HTMLBuilder<HTMLElementTagNameMap[T]> {
    const element: HTMLElementTagNameMap[T] = document.createElement(tag);
    return internalBuilder(element);
}
export function fragmentOf(children: Node[]): DocumentFragment {
    const fragment = document.createDocumentFragment();
    for (const child of children) {
        fragment.appendChild(child);
    }
    return fragment;
}
export function replaceContent(parent: HTMLElement, replacement: Node): void {
    parent.innerHTML = '';
    parent.appendChild(replacement);
}
