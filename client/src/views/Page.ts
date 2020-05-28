import { Page } from '../types';
import * as Bacon from 'baconjs';

export interface PageViewState {
    page: Page;
    editing: boolean;
}

interface PageView {
    element: HTMLElement;
}

export function makePageView(
    state$: Bacon.Observable<PageViewState>,
    renderPage: (page: Page) => string,
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

        $page.innerHTML = renderPage(page);
        $page.appendChild($edit);
    };

    // Observables

    state$.onValue((state) => {
        if (state.editing) {
            renderForm(state.page, () => renderView(state.page));
        } else {
            renderView(state.page);
        }
        window.scrollTo(0, 0);
    });

    // Result

    return {
        element: $page,
    };
}
