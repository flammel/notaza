import _ from 'lodash';
import { AppState } from './model';
import { Observable, Subject } from 'rxjs';
import { scan } from 'rxjs/operators';
import { hasOwnProperty } from './util';

// http://day8.github.io/re-frame/Effects/#writing-an-effect-handler
// https://redux-loop.js.org/docs/tutorial/Tutorial.html
// https://redux.js.org/recipes/computing-derived-data

type TransformFn<ResultT> = (state: AppState) => ResultT;
type Selector<ResultT> = (state: AppState) => ResultT;

export interface MessageBus {
    dispatch: Dispatch;
}

export function createSelector<ResultT>(transformFn: TransformFn<ResultT>): Selector<ResultT> {
    return _.memoize(transformFn);
}

export function props<PropsT>(): (props: PropsT) => PropsT {
    return (props): PropsT => props;
}

interface RunEffect<ResultT> {
    fn: () => Promise<ResultT>;
    cb: (suc: ResultT | null, err: unknown) => Message<string, unknown> | undefined;
}

export interface Effects<StateT, RunT = unknown> {
    __effects__: true;
    state: StateT;
    run?: RunEffect<RunT>;
}

export function effects<StateT>(effects: Omit<Effects<StateT>, '__effects__'>): Effects<StateT> {
    return {
        __effects__: true,
        ...effects,
    };
}

function handleRunEffect<ResultT>(dispatch: Dispatch, effect: RunEffect<ResultT> | undefined): void {
    if (effect !== undefined) {
        effect.fn().then(
            (suc) => {
                const message = effect.cb(suc, null);
                if (message !== undefined) {
                    dispatch(message);
                }
            },
            (err) => {
                const message = effect.cb(null, err);
                if (message !== undefined) {
                    dispatch(message);
                }
            },
        );
    }
}

type MessageHandler<StateT, PropsT> = (state: StateT, props: PropsT) => StateT | Effects<StateT>;
export type Message<TypeT extends string = string, PropsT = {}> = { type: TypeT } & PropsT;
type MessageCreator<TypeT extends string, PropsT> = { type: TypeT } & ((props: PropsT) => Message<TypeT, PropsT>);
export function createMessage<TypeT extends string, PropsT>(
    type: TypeT,
    props: (props: PropsT) => PropsT,
): MessageCreator<TypeT, PropsT> {
    const creator = (x: PropsT): Message<TypeT, PropsT> => ({ ...props(x), type });
    return Object.defineProperty(creator, 'type', { value: type, writable: false });
}

export type Dispatch = (message: Message<string, unknown>) => void;
interface Framework<StateT> {
    state$: Observable<StateT>;
    dispatch: Dispatch;
}
type On<StateT, TypeT extends string, PropsT> = [TypeT, MessageHandler<StateT, PropsT>];
export function on<StateT, TypeT extends string, PropsT>(
    creator: MessageCreator<TypeT, PropsT>,
    handler: MessageHandler<StateT, PropsT>,
): On<StateT, TypeT, unknown> {
    return [creator.type, handler as MessageHandler<StateT, unknown>];
}

export function init<StateT>(initialState: StateT, ons: On<StateT, string, unknown>[]): Framework<StateT> {
    const handlers = new Map<string, MessageHandler<StateT, unknown>[]>();
    for (const [onType, onHandler] of ons) {
        const existing = handlers.get(onType);
        if (existing !== undefined) {
            existing.push(onHandler);
        } else {
            handlers.set(onType, [onHandler]);
        }
    }
    const messages$ = new Subject<Message<string, unknown>>();
    const dispatch = <TypeT extends string, PropsT>(message: Message<TypeT, PropsT>): void => messages$.next(message);
    const state$ = messages$.pipe(
        scan((state, message): StateT => {
            const fns = handlers.get(message.type);
            if (fns !== undefined) {
                for (const fn of fns) {
                    const result = fn(state, message);
                    if (hasOwnProperty(result, '__effects__')) {
                        handleRunEffect(dispatch, result.run);
                        return result.state;
                    } else {
                        return result;
                    }
                }
            }
            return state;
        }, initialState),
    );
    return {
        state$,
        dispatch,
    };
}
