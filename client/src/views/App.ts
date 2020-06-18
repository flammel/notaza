import { NotificationsView } from './Notifications';
import { SidebarView } from './Sidebar';
import { PageView } from './Page';
import { Store } from '../store';

export class AppView extends HTMLDivElement {
    constructor(store: Store) {
        super();

        this.classList.add('app');
        this.appendChild(new SidebarView(store));
        this.appendChild(new PageView(store));
        this.appendChild(new NotificationsView(store));
    }
}
customElements.define('n-app', AppView, { extends: 'div' });
