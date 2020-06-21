import { Observable } from 'rxjs';

export interface WrappedElement<T extends HTMLElement = HTMLElement> {
    $element: T;
}

export function bindInnerText(element: HTMLElement, innerText$: Observable<string>): void {
    innerText$.subscribe((newText) => (element.innerText = newText));
}


export function bindInnerHtml(element: HTMLElement, innerText$: Observable<string>): void {
    innerText$.subscribe((newText) => (element.innerHTML = newText));
}
