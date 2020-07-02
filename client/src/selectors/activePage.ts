import { createSelector } from '../framework';
import { Page } from '../model';

export const selectActivePage = createSelector((state): Page | undefined => {
    if (state.activePage === undefined) {
        return undefined;
    }
    console.log('select ' + state.activePage);
    return state.pages.find((page) => page.id === state.activePage);
});
