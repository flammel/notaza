import { Store } from './store/store';
import { Observable } from 'rxjs';

export interface Block {
    content: string;
    children: Block[];
}
export interface Page {
    id: PageId;
    title: string;
    created: string;
    blocks: Block[];
}
export type Pages = Page[];
export type PageId = string;
export interface Notification {
    type: 'success' | 'error';
    message: string;
}
export interface AppState {
    sidebar: {
        query: string;
    };
    notifications: Notification[];
    pages: Pages;
    activePageId?: string;
    editing?: {
        blockPath: BlockPath;
    };
}
export type BlockPath = number[];
export type AppStore = Store<AppState>;
