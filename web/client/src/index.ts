import './index.scss';
import { makeApi } from './Api';
import { makeApp } from './App';
import { makeRenderer } from './Renderer';

const api = makeApi(window.localStorage.getItem('apiUri') ?? '');
const renderer = makeRenderer();
const app = makeApp(renderer, api);
document.getElementById('container')?.appendChild(app.element);

// PWA

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/serviceWorker.js').then();
    });
}
