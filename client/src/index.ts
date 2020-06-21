import { Api } from './Api';
import { AppView } from './views/AppView';
import { PageParser } from './PageParser';
import { BlockRenderer } from './BlockRenderer';
import './index.scss';
import { PageId } from './Page';

const pageParser = new PageParser();
const blockRenderer = new BlockRenderer();
const api = new Api(window.localStorage.getItem('apiUri') ?? '', pageParser);
const appView = new AppView(blockRenderer);
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
    appView.setPages(pages);
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
