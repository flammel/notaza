import * as MarkdownIt from 'markdown-it';
const links = (md) => {
    md.core.ruler.push('notaza_links', (state) => {
        const fn = (token) => {
            if (token.children) {
                token.children.map(fn);
            }
            if (token.type === 'link_open') {
                const href = token.attrGet('href');
                const existingClasses = token.attrGet('class') || '';
                if ((href === null || href === void 0 ? void 0 : href.startsWith('./')) && href.endsWith('.md')) {
                    token.attrSet('class', existingClasses + ' internal');
                    token.attrSet('href', (href === null || href === void 0 ? void 0 : href.slice(2, -3)) || '');
                }
                else {
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
export function makeRenderer() {
    const mdIt = MarkdownIt({ html: true, linkify: true }).use(links);
    return {
        render: (markdown) => {
            return mdIt.render(markdown);
        },
    };
}
//# sourceMappingURL=Renderer.js.map