import { MarkdownRenderer } from './MarkdownRenderer';
import { Api } from './Api';
import { View } from './View';

import './index.scss';

const apiUrl = window.localStorage.getItem('apiUri');

if (apiUrl === null) {
    const $form = document.createElement('form');
    const $input = document.createElement('input');
    const $button = document.createElement('button');

    $form.addEventListener('submit', () => {
        window.localStorage.setItem('apiUrl', $input.value);
    });

    $form.appendChild($input);
    $form.appendChild($button);
    document.body.appendChild($form);
} else {
    const api = new Api(apiUrl);
    const view = new View(
        document.getElementById('container') as HTMLElement,
        new MarkdownRenderer(),
        window.location.hash.substring(2),
    );

    api.loadPages().then((pages) => {
        view.setPages(pages);
    });

    window.addEventListener('hashchange', () => {
        view.setUrl(window.location.hash.substring(2));
    });
}
