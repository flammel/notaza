import { AppState } from './state';
import { AppAction } from './action';
import { Effects } from './store';
import * as handlers from './handlers/handlers';
import { assertNever } from '../util';

export function actionHandler(state: AppState, action: AppAction): Effects {
    switch (action.type) {
        case 'SetSearchAction':
            return handlers.setSearch(state, action.search);
        case 'SetUrlAction':
            return handlers.setUrl(state, action.url);
        case 'PagesLoadedAction':
            return handlers.setPages(state, action.pages);
        case 'SetPageTitleAction':
            return handlers.setPageTitle(state, action.title);
        case 'ToggleDoneAction':
            return handlers.toggleDone(state, action.blockId);
        case 'StartEditingAction':
            return handlers.startEditing(state, action.blockId);
        case 'StopEditingAction':
            return handlers.stopEditing(state, action.content);
        case 'RemoveBlockAction':
            return handlers.removeBlock(state);
        case 'SplitBlockAction':
            return handlers.splitBlock(state, action.before, action.after);
        case 'IndentBlockAction':
            return handlers.indentBlock(state, action.content);
        case 'UnindentBlockAction':
            return handlers.unindentBlock(state, action.content);
        case 'PageSavedAction':
            return handlers.addSuccessNotification(state, 'page saved');
        case 'PageSaveFailedAction':
            return handlers.addErrorNotification(state, 'save failed');
        case 'RemoveNotificationAction':
            return handlers.removeNotification(state, action.notification);
        case 'MoveUpAction':
            return handlers.moveUp(state, action.content);
        case 'MoveDownAction':
            return handlers.moveDown(state, action.content);
        case 'InboxAction':
            return handlers.inbox(state, action.block);
        case 'UploadFileStartAction':
            return handlers.uploadFileStart(state, action.file);
        case 'UploadFileFinishAction':
            return handlers.uploadFileFinish(state, action.filename);
        default:
            assertNever(action);
    }
}
