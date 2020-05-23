import * as MarkdownIt from 'markdown-it';
import * as Token from 'markdown-it/lib/token';
import * as frontmatter from 'markdown-it-front-matter';

const links: MarkdownIt.PluginSimple = (md): void => {
    md.core.ruler.push('notaza_links', (state): boolean => {
        const fn = (token: Token): void => {
            if (token.children) {
                token.children.map(fn);
            }
            if (token.type === 'link_open') {
                const href = token.attrGet('href');
                const internal = href?.indexOf('./') === 0;
                const existingClasses = token.attrGet('class') || '';

                if (internal) {
                    token.attrSet('class', existingClasses + ' internal');
                    token.attrSet('href', href?.slice(0, -3) || '');
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

export interface Renderer {
    render: (markdown: string) => string;
}

export function makeRenderer(): Renderer {
    const mdIt = MarkdownIt({ html: true, linkify: true })
        .use(links)
        .use(frontmatter.default, () => {
            return;
        });
    return {
        render: (markdown: string): string => {
            return mdIt.render(markdown);
        },
    };
}
