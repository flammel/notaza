import { Api } from '../service/Api';
import { EffectHandler, Dispatch } from './store';
import { AppEffect } from './effect';
import { assertNever } from '../util';
import { actions } from './action';

export function createEffectHandler(api: Api): EffectHandler {
    return (effect: AppEffect, dispatch: Dispatch): void => {
        switch (effect.type) {
            case 'DelayedDispatchEffect':
                setTimeout(() => dispatch(effect.action), effect.delay);
                break;
            case 'SavePageEffect':
                api.savePage(effect.page)
                    .then(() => dispatch({ type: 'PageSavedAction' }))
                    .catch(() => dispatch({ type: 'PageSaveFailedAction' }));
                break;
            case 'DocumentTitleEffect':
                document.title = effect.title;
                break;
            case 'UploadFileEffect':
                api.uploadFile(effect.file).then((uploaded) => dispatch(actions.uploadFinished(uploaded.filename)));
                break;
            default:
                assertNever(effect);
        }
    };
}
