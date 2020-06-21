import { Api } from './Api';
import { AppView } from './views/AppView';
import { PageParser } from './PageParser';
import { BlockRenderer } from './BlockRenderer';
import './index.scss';
import { PageId } from './Page';
import { PageRepository } from './PageRepository';
import { PageSerializer } from './PageSerializer';

const pageParser = new PageParser();
const pageSerializer = new PageSerializer();
const blockRenderer = new BlockRenderer();
const api = new Api(window.localStorage.getItem('apiUri') ?? '', pageParser, pageSerializer);
const pageRepository = new PageRepository(api);
const appView = new AppView(blockRenderer, pageRepository);
document.getElementById('container')?.appendChild(appView.$element);

function urlToPageId(url: string): PageId {
    if (url.startsWith('/')) {
        return url.substring(1);
    } else if (url.startsWith('./')) {
        return url.substring(2);
    } else {
        return url;
    }
}

api.loadPages().then((pages) => {
    pageRepository.setPages(pages);
    appView.setActivePageId(urlToPageId(window.location.pathname));
});

document.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement && event.target.classList.contains('internal')) {
        event.preventDefault();
        const href = event.target.getAttribute('href');
        if (href) {
            window.history.pushState(null, href, href);
            appView.setActivePageId(urlToPageId(href));
        }
    }
});

window.addEventListener('popstate', () => {
    appView.setActivePageId(urlToPageId(window.location.pathname));
});

// PWA

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/serviceWorker.js').then();
    });
}
