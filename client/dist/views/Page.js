function renderBlocks(blocks) {
    if (blocks.length === 0) {
        return document.createDocumentFragment();
    }
    const $ul = document.createElement('ul');
    for (const block of blocks) {
        const $li = document.createElement('li');
        $li.innerText = block.content;
        $li.appendChild(renderBlocks(block.children));
        $ul.appendChild($li);
    }
    return $ul;
}
export function makePageView(state$, renderPage, savePage) {
    // Elements
    const $page = document.createElement('div');
    $page.classList.add('page');
    // Helpers
    const renderForm = (page, stopEditing) => {
        const $textarea = document.createElement('textarea');
        $textarea.innerHTML = '';
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
    const renderView = (page) => {
        const $edit = document.createElement('button');
        $edit.innerText = 'edit';
        $edit.classList.add('edit-button');
        $edit.addEventListener('click', () => renderForm(page, () => renderView(page)));
        $page.innerHTML = '';
        $page.appendChild(renderBlocks(page.blocks));
        // $page.appendChild($edit);
    };
    // Observables
    state$.onValue((state) => {
        if (state.editing) {
            renderForm(state.page, () => renderView(state.page));
        }
        else {
            renderView(state.page);
        }
        window.scrollTo(0, 0);
    });
    // Result
    return {
        element: $page,
    };
}
//# sourceMappingURL=Page.js.map