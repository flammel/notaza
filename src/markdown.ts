import * as MarkdownIt from 'markdown-it';
import * as Token from 'markdown-it/lib/token';
import StateCore from 'markdown-it/lib/rules_core/state_core';
import { memoize, urlize } from './util';

const links: MarkdownIt.PluginSimple = (md): void => {
    md.core.ruler.push('notaza_links', (state): boolean => {
        const fn = (token: Token): void => {
            if (token.children !== null) {
                token.children.map(fn);
            }
            if (token.type === 'link_open') {
                const href = token.attrGet('href');
                const existingClasses = token.attrGet('class') || '';

                if (href?.startsWith('./') && href.endsWith('.md')) {
                    token.attrSet('class', existingClasses + ' internal');
                    token.attrSet('href', href !== undefined ? '/#/' + href.substring(2) : '');
                } else {
                    token.attrSet('target', '_blank');
                    token.attrSet('rel', 'noreferrer noopener');
                    token.attrSet('class', existingClasses + ' external');
                }
            }
        };
        state.tokens.map(fn);
        return true;
    });
};

// https://github.com/svbergerem/markdown-it-hashtag/blob/master/index.js
const hashtags: MarkdownIt.PluginSimple = (md): void => {
    const regex = new RegExp(/(^|\s|\()#([\w-]+)/g);
    md.core.ruler.after('inline', 'hashtag', (state: StateCore): boolean => {
        for (const blockToken of state.tokens) {
            if (blockToken.type === 'inline') {
                let inLink = false;
                const newChildren = blockToken.children;
                for (const [index, token] of (blockToken.children || []).entries()) {
                    if (token.type === 'link_open') {
                        inLink = true;
                        continue;
                    }
                    if (token.type === 'link_close') {
                        inLink = false;
                        continue;
                    }
                    if (inLink || token.type === 'code_inline') {
                        continue;
                    }
                    const nodes = [];
                    let text = token.content;
                    const matches = text.match(regex);
                    if (matches !== null) {
                        for (const match of matches) {
                            const tagName = match.split('#', 2)[1];
                            const pos = text.indexOf('#' + tagName, text.indexOf(match));
                            if (pos > 0) {
                                const leadingTextToken = new Token('text', '', 0);
                                leadingTextToken.content = text.slice(0, pos);
                                leadingTextToken.level = token.level;
                                nodes.push(leadingTextToken);
                            }
                            const hashtagToken = new Token('hashtag', '', 0);
                            hashtagToken.content = tagName;
                            hashtagToken.level = token.level;
                            nodes.push(hashtagToken);
                            text = text.slice(pos + 1 + tagName.length);
                        }
                        if (text.length > 0) {
                            const followingTextToken = new Token('text', '', 0);
                            followingTextToken.content = text;
                            followingTextToken.level = token.level;
                            nodes.push(followingTextToken);
                        }
                        newChildren?.splice(index, 1, ...nodes);
                    }
                }
                blockToken.children = newChildren;
            }
        }
        return true;
    });
    md.renderer.rules.hashtag = (tokens, index): string =>
        `<a class="internal" href="/#/${tokens[index].content}.md">#${tokens[index].content}</a>`;
};

const wikilinks: MarkdownIt.PluginSimple = (md): void => {
    const regex = new RegExp(/(^|\s|\()\[\[([\w -_\/]+)\]\]($|\s|.|,|-|\/|:|\))/g);
    md.core.ruler.after('inline', 'wikilink', (state: StateCore): boolean => {
        for (const blockToken of state.tokens) {
            if (blockToken.type === 'inline') {
                let inLink = false;
                const newChildren = blockToken.children;
                for (const [index, token] of (blockToken.children || []).entries()) {
                    if (token.type === 'link_open') {
                        inLink = true;
                        continue;
                    }
                    if (token.type === 'link_close') {
                        inLink = false;
                        continue;
                    }
                    if (inLink || token.type === 'code_inline') {
                        continue;
                    }
                    const nodes = [];
                    let text = token.content;
                    const matches = text.match(regex);
                    if (matches !== null) {
                        for (const match of matches) {
                            const title = match.split('[[', 2)[1].split(']]', 2)[0];
                            const pos = text.indexOf('[[' + title + ']]', text.indexOf(match));
                            if (pos > 0) {
                                const leadingTextToken = new Token('text', '', 0);
                                leadingTextToken.content = text.slice(0, pos);
                                leadingTextToken.level = token.level;
                                nodes.push(leadingTextToken);
                            }
                            const wikilinkToken = new Token('wikilink', '', 0);
                            wikilinkToken.content = title;
                            wikilinkToken.level = token.level;
                            nodes.push(wikilinkToken);
                            text = text.slice(pos + 2 + title.length + 2);
                        }
                        if (text.length > 0) {
                            const followingTextToken = new Token('text', '', 0);
                            followingTextToken.content = text;
                            followingTextToken.level = token.level;
                            nodes.push(followingTextToken);
                        }
                        newChildren?.splice(index, 1, ...nodes);
                    }
                }
                blockToken.children = newChildren;
            }
        }
        return true;
    });
    md.renderer.rules.wikilink = (tokens, index): string =>
        `<a class="internal" href="/#/${urlize(tokens[index].content)}.md">${tokens[index].content}</a>`;
};

const tweetsAndBookmarks: MarkdownIt.PluginSimple = (md): void => {
    const originalFenceRenderer = md.renderer.rules.fence;
    md.renderer.rules.fence = (tokens, idx, options, env, self): string => {
        const token = tokens[idx];
        if (token.info.trim() === 'tweet') {
            return '';
        } else if (token.info.trim() === 'bookmark') {
            return '';
        } else if (originalFenceRenderer) {
            return originalFenceRenderer(tokens, idx, options, env, self);
        } else {
            return self.renderToken(tokens, idx, options);
        }
    };
};

const mdIt = MarkdownIt({ html: true, linkify: true }).use(links).use(hashtags).use(wikilinks).use(tweetsAndBookmarks);
interface NotazaMd {
    render: (markdown: string) => string;
    parse: (markdown: string) => Token[];
    renderTokens: (tokens: Token[]) => string;
}
export function notazamd(): NotazaMd {
    return {
        render: memoize((markdown): string => mdIt.render(markdown)),
        parse: memoize((markdown): Token[] => mdIt.parse(markdown, {})),
        renderTokens: (tokens): string => mdIt.renderer.render(tokens, {}, {}),
    };
}
