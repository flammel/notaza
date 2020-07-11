import { AppAction } from './action';
import { Page } from './state';

export interface DelayedDispatchEffect {
    type: 'DelayedDispatchEffect';
    delay: number;
    action: AppAction;
}
export interface SavePageEffect {
    type: 'SavePageEffect';
    page: Page;
}
export interface DocumentTitleEffect {
    type: 'DocumentTitleEffect';
    title: string;
}
export type AppEffect = DelayedDispatchEffect | SavePageEffect | DocumentTitleEffect;
