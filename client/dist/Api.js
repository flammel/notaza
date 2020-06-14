export function makeApi(url) {
    return {
        loadPages() {
            return fetch(url + '/pages')
                .then((r) => r.json())
                .then((json) => json.data.map(readPage));
        },
        savePage(page) {
            return fetch(url + '/pages', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(page),
            })
                .then((res) => res.json())
                .then((json) => {
                if (json.success) {
                    return Promise.resolve(json.data.map(readPage));
                }
                else {
                    return Promise.reject();
                }
            })
                .catch(() => Promise.reject());
        },
        deletePage(page) {
            return fetch(url + '/pages/' + page.id, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
                .then((res) => res.json())
                .then((json) => json);
        },
        uploadFile(file) {
            const formData = new FormData();
            formData.append('file', file);
            return fetch(url + '/files', {
                method: 'POST',
                body: formData,
            })
                .then((res) => res.json())
                .then((json) => json.data);
        },
    };
}
function getTitle(markdown) {
    const match = markdown.match(/^title: (.*)$/gm);
    if (match && match[0]) {
        return match[0].substring('title: '.length);
    }
    return undefined;
}
function readPage({ id, markdown }) {
    const afterFrontmatter = markdown.split('\n---\n').pop() || markdown;
    const beforeBacklinks = afterFrontmatter.split('\n<!-- notaza backlinks start -->\n').shift();
    const toParse = beforeBacklinks === undefined ? '' : beforeBacklinks.trim();
    console.log(toParse);
    const blocks = parseBlocks(toParse);
    console.log(blocks);
    return {
        id,
        title: getTitle(markdown) || id,
        created: '',
        blocks,
    };
}
function parseBlocks(markdown) {
    const lines = markdown.split('\n');
    const grouped = [];
    for (const line of lines) {
        const group = grouped[grouped.length - 1];
        if (line.match(/^ *\* .*$/)) {
            const indentation = line.indexOf('*');
            grouped.push([indentation, [line.substring(indentation + 2)]]);
        }
        else if (group) {
            group[1].push(line.substring(group[0] + 2));
        }
        else {
            console.error('line without * outside group: ' + line);
            return [];
        }
    }
    const rootBlock = { content: '', children: [], indentation: -1 };
    const blocks = [rootBlock];
    for (const group of grouped) {
        const top = blocks[blocks.length - 1];
        if (!top) {
            console.error('no top block', { blocks, group });
            return [];
        }
        const newBlock = { content: group[1].join('\n'), children: [], indentation: group[0] };
        if (newBlock.indentation > top.indentation) {
            top.children.push(newBlock);
            blocks.push(newBlock);
            continue;
        }
        if (newBlock.indentation == top.indentation) {
            blocks.pop();
            const newTop = blocks[blocks.length - 1];
            if (!newTop) {
                console.error('no parent to pop', { blocks, top, group });
                return [];
            }
            newTop.children.push(newBlock);
            blocks.push(newBlock);
            continue;
        }
        if (newBlock.indentation < top.indentation) {
            let popped = blocks.pop();
            while (popped && newBlock.indentation <= popped.indentation) {
                popped = blocks.pop();
            }
            if (!popped) {
                console.error('empty stack', { blocks, group });
                return [];
            }
            popped.children.push(newBlock);
            blocks.push(popped);
            blocks.push(newBlock);
        }
    }
    return rootBlock.children;
}
//# sourceMappingURL=Api.js.map