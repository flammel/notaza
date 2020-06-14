import { Pages, BlockPath } from '../types';
import { createAction, props } from './store';

export const updateQuery = createAction('update query', props<{ query: string }>());
export const startEditing = createAction('startEditing', props<{ blockPath: BlockPath }>());
export const stopEditing = createAction('stopEditing', props<{}>());
export const setPages = createAction('setPages', props<{ pages: Pages }>());
export const setEditedContent = createAction('setEditedContent', props<{ content: string }>());
export const setUrl = createAction('setUrl', props<{ url: string }>());
