import * as MarkdownIt from 'markdown-it';
import * as Token from 'markdown-it/lib/token';

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
                    token.attrSet('href', href?.slice(2, -3) || '');
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

export class Renderer {
    private readonly mdIt = MarkdownIt({ html: true, linkify: true }).use(links);

    public render(markdown: string): string {
        return this.mdIt.renderInline(markdown);
    }
}
