import { Page, BlockId, Notification } from '../model';
import { createMessage, props } from '../framework';

export const setSearch = createMessage('setSearch', props<{ search: string }>());
export const setUrl = createMessage('setUrl', props<{ url: string }>());
export const pagesLoaded = createMessage('pagesLoaded', props<{ pages: Page[] }>());
export const setPageTitle = createMessage('setPageTitle', props<{ title: string }>());
export const toggleDone = createMessage('toggleDone', props<{ blockId: BlockId }>());
export const startEditing = createMessage('startEditing', props<{ blockId: BlockId }>());
export const stopEditing = createMessage('stopEditing', props<{ content: string }>());
export const removeBlock = createMessage('removeBlock', props<{}>());
export const splitBlock = createMessage('splitBlock', props<{ before: string; after: string }>());
export const indentBlock = createMessage('indentBlock', props<{ content: string }>());
export const unindentBlock = createMessage('unindentBlock', props<{ content: string }>());
export const pageSaved = createMessage('pageSaved', props<{}>());
export const pageSaveFailed = createMessage('pageSaveFailed', props<{}>());
export const removeNotification = createMessage('removeNotification', props<{ notification: Notification }>());
export const moveUp = createMessage('moveUp', props<{ content: string }>());
export const moveDown = createMessage('moveDown', props<{ content: string }>());
