import { MarkdownRenderer } from './MarkdownRenderer';
import { Page } from './Page';
import { getSearchResults } from './search';

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

    private renderPage(): void {
        const page = this.pages.find((page) => page.filename === this.url);
        if (page !== undefined) {
            const $page = document.createElement('div');
            $page.classList.add('page');
            $page.innerHTML = this.markdownRenderer.render(page);
            if (!($page.firstChild instanceof HTMLHeadingElement)) {
                const $title = document.createElement('h1');
                $title.innerHTML = page.title;
                $page.insertBefore($title, $page.firstChild);
            }
            this.$content.innerHTML = '';
            this.$content.appendChild($page);
            this.$content.appendChild(this.renderBacklinks(page));
        } else {
            this.$content.innerHTML = '';
        }
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

        const $list = document.createElement('ul');

        for (const other of this.pages) {
            if (other.filename !== page.filename) {
                if (
                    other.body.includes('](./' + page.filename + ')') ||
                    other.body.includes('](./' + page.filename.slice(0, -3) + ')') ||
                    other.body.includes('#' + page.filename.slice(0, -3)) ||
                    other.body.includes('[[' + page.title + ']]')
                ) {
                    const $other = document.createElement('li');
                    const $link = document.createElement('a');
                    $link.innerText = other.title;
                    $link.setAttribute('href', '/#/' + other.filename);
                    $other.appendChild($link);
                    $list.appendChild($other);
                }
            }
        }

        $fragment.appendChild($headline);
        $fragment.appendChild($list);

        return $fragment;
    }
}
