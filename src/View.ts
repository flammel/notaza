import { MarkdownRenderer } from './MarkdownRenderer';
import { Page } from './Page';
import { getSearchResults } from './search';
import { getBacklinks } from './backlinks';
import { Bookmark } from './Bookmarks';

interface PageTree {
    page: Page;
    children: PageTree[];
}

function isChildOf(child: Page, parent: Page): boolean {
    return parent.filename === child.filename.split('.').slice(0, -2).join('.') + '.md';
}

function buildPageTree(pages: Page[], query: string): PageTree[] {
    if (query !== '') {
        return getSearchResults(pages, query).map((result) => ({
            page: result.page,
            children: [],
        }));
    }

    const trees: PageTree[] = [];
    const stack: PageTree[] = [];

    const sorted = pages.sort((a, b) => a.fileId.localeCompare(b.fileId));
    for (const page of sorted) {
        let top = stack.pop();
        const tree = { page, children: [] };
        if (top !== undefined) {
            while (top && !isChildOf(page, top.page)) {
                top = stack.pop();
            }
            if (top) {
                top.children.push(tree);
                stack.push(top);
            } else {
                trees.push(tree);
            }
        }
        stack.push(tree);
    }

    return trees;
}

function findPage(pages: Page[], url: string): Page {
    const found = pages.find((page) => page.filename === url);
    if (found === undefined) {
        const title = url.slice(0, -3);
        return new Page(url, undefined, `---\ntitle:${title}\n---\n`);
    } else {
        return found;
    }
}

export class View {
    private readonly $content: HTMLElement;
    private readonly $results: HTMLElement;
    private readonly markdownRenderer: MarkdownRenderer;
    private readonly editLink: (page: Page) => string;

    private pages: Page[] = [];
    private bookmarks: Bookmark[] = [];
    private url: string = '';
    private query: string = '';

    public constructor(
        $container: HTMLElement,
        markdownRenderer: MarkdownRenderer,
        url: string,
        editLink: (page: Page) => string,
    ) {
        this.url = url;
        this.markdownRenderer = markdownRenderer;
        this.editLink = editLink;

        this.$content = document.createElement('div');
        this.$content.classList.add('content');

        this.$results = document.createElement('ul');
        this.$results.classList.add('sidebar__list', 'sidebar__list--root');

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

    public setBookmarks(bookmarks: Bookmark[]): void {
        this.bookmarks = bookmarks;
        this.renderPage();
    }

    public setUrl(url: string): void {
        this.url = url;
        this.renderPage();
        this.markSidebarItemActive();
    }

    public setQuery(query: string): void {
        this.query = query;
        this.renderSearchResults();
        this.markSidebarItemActive();
    }

    private markSidebarItemActive(): void {
        this.$results.querySelector('.active')?.classList.remove('active');
        const activeItem = this.$results.querySelector('a[href="/#/' + this.url + '"]');
        if (activeItem) {
            activeItem.classList.add('active');
            let parent: Element | null | undefined = activeItem;
            while ((parent = parent.parentElement?.closest('.sidebar__item'))) {
                parent.classList.add('sidebar__item--open');
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

    private renderTree(tree: PageTree): HTMLElement {
        const $item = document.createElement('li');
        $item.classList.add('sidebar__item');

        const $link = document.createElement('a');
        $link.classList.add('sidebar__link');
        $link.setAttribute('href', '/#/' + tree.page.filename);
        $link.innerHTML = tree.page.title;
        $item.appendChild($link);

        if (tree.children.length > 0) {
            const $opener = document.createElement('span');
            $opener.classList.add('sidebar__item-opener');
            $opener.innerText = '+';
            $opener.addEventListener('click', () => {
                $item.classList.toggle('sidebar__item--open');
            });
            $item.appendChild($opener);

            const $children = document.createElement('ul');
            $children.classList.add('sidebar__list');
            for (const child of tree.children) {
                $children.appendChild(this.renderTree(child));
            }
            $item.appendChild($children);
        }

        return $item;
    }

    private renderSearchResults(): void {
        const $container = document.createDocumentFragment();
        const trees = buildPageTree(this.pages, this.query);
        for (const tree of trees) {
            $container.appendChild(this.renderTree(tree));
        }
        this.$results.innerHTML = '';
        this.$results.appendChild($container);
    }

    private renderPage(): void {
        if (this.url === '') {
            this.$content.innerHTML = '';
            return;
        }

        const page = findPage(this.pages, this.url);
        const $page = document.createElement('div');
        $page.classList.add('page');
        $page.innerHTML = this.markdownRenderer.render(page);
        if (!($page.firstChild instanceof HTMLHeadingElement)) {
            const $title = document.createElement('h1');
            $title.innerHTML = page.title;
            $page.insertBefore($title, $page.firstChild);
        }

        const $editLink = document.createElement('a');
        $editLink.setAttribute('href', this.editLink(page));
        $editLink.setAttribute('target', '_blank');
        $editLink.setAttribute('rel', 'noreferrer noopener');
        $editLink.innerText = 'edit';
        $page.appendChild($editLink);

        $page.appendChild(this.renderBookmarks(page));

        $page.appendChild(this.renderBacklinks(page));

        this.$content.innerHTML = '';
        this.$content.appendChild($page);

        document.title = 'KB | ' + page.title;
    }

    private renderBookmarks(page: Page): Node {
        const $fragment = document.createDocumentFragment();

        const $headline = document.createElement('h2');
        $headline.innerText = 'Bookmarks';
        $fragment.appendChild($headline);

        const matchingBookmarks = this.bookmarks.filter((bookmark) => {
            const description = bookmark.description.toLocaleLowerCase();
            return (
                bookmark.tags.includes(page.fileId) ||
                description.includes('](./' + page.filename.toLocaleLowerCase() + ')') ||
                description.includes('](./' + page.fileId + ')') ||
                description.includes('#' + page.fileId) ||
                description.includes('[[' + page.title.toLocaleLowerCase() + ']]')
            );
        });
        for (const bookmark of matchingBookmarks) {
            const $container = document.createElement('div');
            $container.classList.add('bookmark');
            const $title = document.createElement('h3');
            $title.classList.add('bookmark__title');
            const $link = document.createElement('a');
            $link.setAttribute('href', bookmark.url);
            $link.setAttribute('target', '_blank');
            $link.setAttribute('rel', 'noreferrer noopener');
            $link.innerText = bookmark.title;
            $title.appendChild($link);

            const $url = document.createElement('div');
            $url.classList.add('bookmark__url');
            $url.innerText = bookmark.url;

            const $tags = document.createElement('div');
            $tags.classList.add('bookmark__tags');
            $tags.innerHTML = bookmark.tags.map((tag) => `<a href="#/${tag}.md">${tag}</a>`).join(' ');

            const $description = document.createElement('div');
            $description.classList.add('bookmark__description');
            $description.innerHTML = this.markdownRenderer.renderString(bookmark.description);

            $container.appendChild($title);
            $container.appendChild($url);
            $container.appendChild($tags);
            $container.appendChild($description);

            $fragment.appendChild($container);
        }

        return $fragment;
    }

    private renderBacklinks(page: Page): Node {
        const $fragment = document.createDocumentFragment();

        const $headline = document.createElement('h2');
        $headline.innerText = 'References';
        $fragment.appendChild($headline);

        for (const pageWithBacklinks of getBacklinks(this.markdownRenderer, this.pages, page)) {
            const $container = document.createElement('div');
            $container.classList.add('reference');
            const $title = document.createElement('h3');
            const $link = document.createElement('a');
            $link.setAttribute('href', '/#/' + pageWithBacklinks.page.filename);
            $link.innerText = pageWithBacklinks.page.title;
            $title.appendChild($link);
            $container.appendChild($title);
            for (const backlink of pageWithBacklinks.backlinks) {
                const $backlink = document.createElement('div');
                $backlink.innerHTML = this.markdownRenderer.renderTokens(backlink.content);
                $container.appendChild($backlink);
            }
            $fragment.appendChild($container);
        }

        return $fragment;
    }
}
