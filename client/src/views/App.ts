import { AppStore } from '../types';
import { NotificationsView } from './Notifications';
import { SidebarView } from './Sidebar';
import { PageView } from './Page';

export class AppView extends HTMLDivElement {
    constructor(store: AppStore) {
        super();

        this.classList.add('app');
        this.appendChild(new SidebarView(store));
        this.appendChild(new PageView(store));
        this.appendChild(new NotificationsView(store));
    }
}
customElements.define('n-app', AppView, { extends: 'div' });
