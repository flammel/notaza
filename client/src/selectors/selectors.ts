import { AppState, PageId } from '../store/state';
import { getSearchResults } from './sidebar';
import { getActivePage, ActivePage } from './page';

const selectorCache = new Map<Selector<unknown>, [AppState, unknown]>();
export type Selector<ResultT> = (state: AppState) => ResultT;
export function createSelector<ResultT>(fn: (state: AppState) => ResultT): Selector<ResultT> {
    return (state: AppState): ResultT => {
        const cached = selectorCache.get(fn);
        if (cached !== undefined && cached[0] === state) {
            return cached[1] as ResultT;
        }
        const computed = fn(state);
        selectorCache.set(fn, [state, computed]);
        return computed;
    };
}

export const querySelector = createSelector<string>((state: AppState) => state.search);
export const searchResultSelector = createSelector((state: AppState) => getSearchResults(state.pages, state.search));
export const pageSelector = (pageId: PageId): Selector<ActivePage | undefined> =>
    createSelector((state: AppState) => getActivePage(state, pageId));
export const notificationsSelector = createSelector((state: AppState) => state.notifications);
