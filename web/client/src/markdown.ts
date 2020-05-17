import { AppState } from './types';

const singleTokens: { [key: string]: [string, string] } = {
    _: ['<emph>', '</emph>'],
    '*': ['<strong>', '</strong>'],
    '~': ['<strike>', '</strike>'],
};

interface StackEntry {
    token: string;
    content: string;
}

function takeUntil(markdown: string, until: string, idx: number): [string, number] {
    const endIdx = markdown.indexOf(until, idx);
    const take = markdown.substring(idx, endIdx < 0 ? undefined : endIdx);
    return [take, endIdx < 0 ? markdown.length : endIdx + until.length];
}

function buildLinkTag(target: string, title: string): string {
    let attributes = '';
    let renderMarkdown = true;
    if (target.substring(0, 2) === './') {
        // const page = wiki.getPage(target.substring(2));
        // if (page.exists) {
        attributes = ' class="internal" ';
        //     if (title.trim().length < 1) {
        //         title = page.getTitle();
        //         renderMarkdown = false;
        //     }
        // } else {
        //     attributes = ' class="internal missing" ';
        // }
    } else {
        attributes = ' target="_blank" rel="noopener noreferrer" class="external" ';
    }
    if (title.trim().length < 1) {
        title = target;
    } else if (renderMarkdown) {
        title = renderInline(title);
    }
    return `<a${attributes} contenteditable="false" href="${target}">${title}</a>`;
}

function renderInline(markdown: string): string {
    let idx = 0;
    const stack: StackEntry[] = [];
    let result = '';
    while (idx < markdown.length) {
        const current = markdown[idx];
        const peeked: StackEntry | undefined = stack[stack.length - 1];
        const peekedBelow: StackEntry | undefined = stack[stack.length - 2];
        const singleTokenTags = singleTokens[current];
        if (singleTokenTags) {
            if (peeked && peeked.token === current) {
                if (peekedBelow) {
                    peekedBelow.content += singleTokenTags[0] + peeked.content + singleTokenTags[1];
                } else {
                    result += singleTokenTags[0] + peeked.content + singleTokenTags[1];
                }
                stack.pop();
            } else {
                stack.push({ token: current, content: '' });
            }
            idx++;
            continue;
        }

        if (peeked) {
            peeked.content += current;
        } else {
            result += current;
        }

        idx++;
    }

    if (result.length < 1 && markdown.length >= 1) {
        return markdown;
    }

    if (stack.length > 0) {
        // Something is unbalanced. Just return unformatted string.
        return markdown;
    }

    return result;
}

export default class Markdown {
    public mathRenderFunction = (raw: string): string => raw;
    public constructor() {
        import('katex').then((exports) => {
            this.mathRenderFunction = exports.renderToString;
            for (const element of document.getElementsByClassName('math')) {
                element.innerHTML = exports.renderToString(element.innerHTML);
            }
        });
    }

    public render(markdown: string): string {
        let idx = 0;
        const stack: StackEntry[] = [];
        let result = '';
        let quote = false;

        if (markdown.startsWith('> ')) {
            idx = 2;
            quote = true;
        } else if (markdown.startsWith('[] ')) {
            idx = 3;
            result = '<input type="checkbox">';
        } else if (markdown.startsWith('[x] ')) {
            idx = 3;
            result = '<input type="checkbox" checked>';
        }

        while (idx < markdown.length) {
            const prev = markdown[idx - 1];
            const current = markdown[idx];
            const peeked: StackEntry | undefined = stack[stack.length - 1];
            const peekedBelow: StackEntry | undefined = stack[stack.length - 2];

            let html;
            if (markdown.startsWith('![', idx)) {
                const [title, titleEndIdx] = takeUntil(markdown, '](', idx + 2);
                const [target, targetEndIdx] = takeUntil(markdown, ')', titleEndIdx);
                idx = targetEndIdx;
                html = `<img src="${target}" alt="${title || target}">`;
            } else if (markdown.startsWith('[', idx)) {
                const [title, titleEndIdx] = takeUntil(markdown, '](', idx + 1);
                const [target, targetEndIdx] = takeUntil(markdown, ')', titleEndIdx);
                idx = targetEndIdx;
                html = buildLinkTag(target, title);
            } else if (markdown.startsWith('$$', idx)) {
                const [math, endIdx] = takeUntil(markdown, '$$', idx + 2);
                idx = endIdx;
                html = `<span class="math">${this.mathRenderFunction(math)}</span>`;
            } else if (markdown.startsWith('http://', idx) || markdown.startsWith('https://', idx)) {
                const [url, endIdx] = takeUntil(markdown, ' ', idx);
                idx = endIdx === markdown.length ? endIdx : endIdx - 1;
                html = buildLinkTag(url, url);
            } else if (markdown.startsWith('`', idx)) {
                const [code, endIdx] = takeUntil(markdown, '`', idx + 1);
                idx = endIdx;
                html = `<code>${code}</code>`;
            }

            if (html) {
                if (peeked) {
                    peeked.content += html;
                } else {
                    result += html;
                }
                continue;
            }

            const singleTokenTags = singleTokens[current];
            if (singleTokenTags) {
                if (peeked && peeked.token === current) {
                    if (peekedBelow) {
                        peekedBelow.content += singleTokenTags[0] + peeked.content + singleTokenTags[1];
                    } else {
                        result += singleTokenTags[0] + peeked.content + singleTokenTags[1];
                    }
                    stack.pop();
                } else if (prev === ' ' || prev === undefined) {
                    stack.push({ token: current, content: '' });
                } else {
                    if (peeked) {
                        peeked.content += current;
                    } else {
                        result += current;
                    }
                }
                idx++;
                continue;
            }

            if (peeked) {
                peeked.content += current;
            } else {
                result += current;
            }

            idx++;
        }

        for (const stackItem of stack) {
            result += stackItem.token + stackItem.content;
        }

        if (result.length < 1 && markdown.length >= 1) {
            return markdown;
        }

        result = result.replace(/\n/g, '<br>');

        if (quote) {
            return '<blockquote>' + result + '</blockquote>';
        }
        return result;
    }
}

export function render(state: AppState, markdown: string): string {
    return new Markdown().render(markdown);
}
