import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

type Selector<State, Selection> = (state: State) => Selection;

export interface Store<State> {
    dispatch: (action: Action) => void;
    select: <Selection>(selector: Selector<State, Selection>) => Observable<Selection>;
}

type ActionHandler<StateT, ActionT, PropsT> = () => void;
type Reducer = () => void;

export interface Action<Type extends string = string, Props extends object = {}> {
    type: Type;
    props: Props;
}
export type ActionCreator<Type extends string, Props extends object> = (props: Props) => Action<Type, Props>;

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
    return (props): Action<Type, PropsT> => ({
        type,
        props,
    });
}

export function createStore<StateT>(initialState: StateT, ...handlers: ActionHandler<StateT, any, any>[]): Store<StateT> {
    const handlerMap = new Map<string, ActionHandler>();
    const state$ = new BehaviorSubject(initialState);
    const actions$ = new Subject();
    return {
        dispatch: (action): void => {
            actions$.next(action);
        },
        select: (selector: Selector<StateT, Selection>): Observable<Selection> => {
            return state$.pipe(map(selector));
        },
    };
}
// const appState$ = commands$.pipe(scan((acc, command) => command(acc), initialState));

export function on<StateT, ActionT extends string, PropsT extends object>(
    creator: ActionCreator<ActionT, PropsT>,
): ActionHandler<StateT, ActionT, PropsT> {
    return () => 
}