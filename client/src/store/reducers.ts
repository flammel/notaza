

function getBlock(page: Page, path: BlockPath): Block | undefined {
    let blocks = page.blocks;
    for (const index of path) {
        if (index === path.length - 1) {
            return blocks[index];
        } else {
            blocks = blocks[index].children;
        }
    }
    return undefined;
}
export function startEditing(blockPath: BlockPath): Command {
    return (oldState): AppState =>
        produce(oldState, (draft) => {
            draft.editing = blockPath;
            draft.editedContent = getBlock(draft.pages[0], blockPath)?.content || '';
            return draft;
        });
}

export function stopEditing(): Command {
    return makeCommand((oldState) => {
        // const block =
        oldState.editing = [];
        oldState.editedContent = '';
    });
}

export function setPages(pages: Pages): Command {
    return (oldState): AppState =>
        produce(oldState, (draft) => {
            draft.pages = pages;
            return draft;
        });
}

export function setEditedContent(content: string): Command {
    return makeCommand((oldState) => {
        oldState.editedContent = content;
    });
}

function urlToId(url: string): PageId {
    if (url.startsWith('/')) {
        url = url.substring(1);
    }
    if (url.startsWith('./')) {
        url = url.substring(2);
    }
    if (url === '') {
        return dateToString(new Date());
    }
    return url;
}
export function setUrl(url: string): Command {
    return (oldState): AppState =>
        produce(oldState, (draft) => {
            draft.urlId = urlToId(url);
            draft.editing = [];
            return draft;
        });
}
