import { Observable, Subject } from 'rxjs';
import { map, distinctUntilChanged, scan, share } from 'rxjs/operators';
import * as _ from 'lodash';

type Selector<State, Selection> = (state: State) => Selection;

export interface Store<State> {
    dispatch: (action: Action) => void;
    select: <Selection>(selector: Selector<State, Selection>) => Observable<Selection>;
}

type ActionHandler<StateT, PropsT> = (state: StateT, props: PropsT) => StateT;

export interface Action<Type extends string = string, Props extends object = {}> {
    type: Type;
    props: Props;
}
export type ActionCreator<TypeT extends string, PropsT extends object> = { type: TypeT } & ((
    props: PropsT,
) => Action<TypeT, PropsT>);

interface Props<PropsT> {
    _props: PropsT;
}
export function props<PropsT>(): Props<PropsT> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return { _props: undefined! };
}

export function createAction<Type extends string, PropsT extends object>(
    type: Type,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _props: Props<PropsT>,
): ActionCreator<Type, PropsT> {
    return Object.defineProperty(
        (props: PropsT): Action<Type, PropsT> => ({
            type,
            props,
        }),
        'type',
        { value: type },
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createStore<StateT>(initialState: StateT, ...reducers: Reducer<StateT, string, any>[]): Store<StateT> {
    const handlerMap = new Map<string, ActionHandler<StateT, object>>();
    for (const reducer of reducers) {
        handlerMap.set(reducer.type, reducer.handler);
    }
    const actions$ = new Subject<Action>();
    const state$ = actions$.pipe(
        scan((state, action: Action) => {
            console.log('received action', action);
            const handler = handlerMap.get(action.type);
            if (handler) {
                return handler(state, action.props);
            } else {
                return state;
            }
        }, initialState),
        share(),
    );
    state$.subscribe((state) => console.log('new state', state));
    return {
        dispatch: (action): void => {
            actions$.next(action);
        },
        select: <Selection>(selector: Selector<StateT, Selection>): Observable<Selection> => {
            return state$.pipe(
                map(selector),
                distinctUntilChanged((a, b) => _.isEqual(a, b)),
            );
        },
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Reducer<StateT, ActionT = string, PropsT = any> {
    type: ActionT;
    handler: (state: StateT, props: PropsT) => StateT;
}

export function on<StateT, ActionT extends string, PropsT extends object>(
    creator: ActionCreator<ActionT, PropsT>,
    handler: ActionHandler<StateT, PropsT>,
): Reducer<StateT, ActionT, PropsT> {
    return {
        type: creator.type,
        handler,
    };
}
