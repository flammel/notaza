import { Api } from '../Api';
import { EffectHandler, Dispatch } from './store';
import { AppEffect } from './effect';
import { assertNever } from '../util';

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
            default:
                assertNever(effect);
        }
    };
}
