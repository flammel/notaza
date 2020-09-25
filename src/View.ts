import { MarkdownRenderer } from './MarkdownRenderer';
import { Page } from './Page';
import { getSearchResults } from './search';
import { getBacklinks } from './backlinks';

export class View {
    private readonly $content: HTMLElement;
    private readonly $results: HTMLElement;
    private readonly markdownRenderer: MarkdownRenderer;

    private pages: Page[] = [];
    private url: string = '';
    private query: string = '';

    public constructor($container: HTMLElement, markdownRenderer: MarkdownRenderer, url: string) {
        this.url = url;
        this.markdownRenderer = markdownRenderer;

        this.$content = document.createElement('div');
        this.$content.classList.add('content');

        this.$results = document.createElement('ul');
        this.$results.classList.add('sidebar__list');

        const $app = document.createElement('div');
        $app.classList.add('app');
        $app.appendChild(this.renderSidebar());
        $app.appendChild(this.$content);

        $container.innerHTML = '';
        $container.appendChild($app);
    }

    public setPages(pages: Page[]): void {
        this.pages = pages;
        this.renderPage();
        this.renderSearchResults();
        this.markSidebarItemActive();
    }

    public setUrl(url: string): void {
        this.url = url;
        this.renderPage();
        this.markSidebarItemActive();
    }

    public setQuery(query: string): void {
        this.query = query;
        this.renderSearchResults();
    }

    private markSidebarItemActive(): void {
        for (const $result of this.$results.children) {
            const $link = $result.querySelector('a');
            if ($link?.getAttribute('href') === '/#/' + this.url) {
                $link.classList.add('active');
            } else if ($link?.classList.contains('active')) {
                $link.classList.remove('active');
            }
        }
    }

    private renderSidebar(): HTMLElement {
        const $sidebar = document.createElement('div');
        $sidebar.classList.add('sidebar');

        const $form = document.createElement('form');
        $form.classList.add('sidebar__header');
        $form.addEventListener('submit', (event) => event.preventDefault());

        const $search = document.createElement('input');
        $search.classList.add('sidebar__search-input');
        $search.setAttribute('placeholder', 'Search');
        $search.addEventListener('input', () => {
            this.setQuery($search.value);
        });

        $form.appendChild($search);
        $sidebar.appendChild($form);
        $sidebar.appendChild(this.$results);

        return $sidebar;
    }

    private findPage(): Page {
        const found = this.pages.find((page) => page.filename === this.url);
        if (found === undefined) {
            const title = this.url.slice(0, -3);
            return new Page(this.url, '0', `---\ntitle:${title}\n---\n`);
        } else {
            return found;
        }
    }

    private renderPage(): void {
        if (this.url === '') {
            this.$content.innerHTML = '';
            return;
        }

        const page = this.findPage();
        const $page = document.createElement('div');
        $page.classList.add('page');
        $page.innerHTML = this.markdownRenderer.render(page);
        if (!($page.firstChild instanceof HTMLHeadingElement)) {
            const $title = document.createElement('h1');
            $title.innerHTML = page.title;
            $page.insertBefore($title, $page.firstChild);
        }

        $page.appendChild(this.renderBacklinks(page));

        this.$content.innerHTML = '';
        this.$content.appendChild($page);

        document.title = 'KB | ' + page.title;
    }

    private renderSearchResults(): void {
        const $container = document.createDocumentFragment();
        for (const result of getSearchResults(this.pages, this.query)) {
            const $result = document.createElement('li');
            $result.classList.add('sidebar__result');

            const $link = document.createElement('a');
            $link.setAttribute('href', '/#/' + result.page.filename);
            $link.innerHTML = result.page.title;

            const $matches = document.createElement('ul');
            for (const match of result.matches) {
                const $match = document.createElement('li');
                $match.classList.add('search-result__match');
                $match.innerHTML = match;
                $matches.appendChild($match);
            }

            $result.appendChild($link);
            $result.appendChild($matches);
            $container.appendChild($result);
        }
        this.$results.innerHTML = '';
        this.$results.appendChild($container);
    }

    private renderBacklinks(page: Page): Node {
        const $fragment = document.createDocumentFragment();

        const $headline = document.createElement('h2');
        $headline.innerText = 'References';
        $fragment.appendChild($headline);

        for (const pageWithBacklinks of getBacklinks(this.markdownRenderer, this.pages, page)) {
            const $title = document.createElement('h3');
            const $link = document.createElement('a');
            $link.setAttribute('href', '/#/' + pageWithBacklinks.page.filename);
            $link.innerText = pageWithBacklinks.page.title;
            $title.appendChild($link);
            $fragment.appendChild($title);
            for (const backlink of pageWithBacklinks.backlinks) {
                const $backlink = document.createElement('div');
                $backlink.innerHTML = this.markdownRenderer.renderTokens(backlink.content);
                $fragment.appendChild($backlink);
            }
        }

        return $fragment;
    }
}
