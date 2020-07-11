import { AppState } from './state';
import { AppAction } from './action';
import { AppEffect } from './effect';

// http://day8.github.io/re-frame/Effects/#writing-an-effect-handler
// https://redux-loop.js.org/docs/tutorial/Tutorial.html
// https://redux.js.org/recipes/computing-derived-data

export type Dispatch = (action: AppAction) => void;
export type Effects = [AppState, ...AppEffect[]];
export type ActionHandler = (state: AppState, action: AppAction) => Effects;
export type EffectHandler = (effect: AppEffect, dispatch: (action: AppAction) => void) => void;
export type StateListener = (state: AppState) => void;

interface Store {
    dispatch: Dispatch;
    subscribe: (listener: StateListener) => void;
}

export function createStore(actionHandler: ActionHandler, effectHandler: EffectHandler, initialState: AppState): Store {
    let state = initialState;
    const listeners: StateListener[] = [];
    const subscribe = (listener: StateListener): void => {
        listeners.push(listener);
    };
    const dispatch = (action: AppAction): void => {
        const [newState, ...effects] = actionHandler(state, action);
        state = newState;
        effects.forEach((effect) => effectHandler(effect, dispatch));
        listeners.forEach((listener) => listener(state));
    };
    return {
        dispatch,
        subscribe,
    };
}
