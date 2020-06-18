import { Observable, Subject } from 'rxjs';
import { map, distinctUntilChanged, scan, share } from 'rxjs/operators';
import * as _ from 'lodash';
import produce from 'immer';

import { State, Action } from './types';

type Selector<SelectionT> = (state: State) => SelectionT;

export class Store {
    private readonly actions$: Subject<Action>;
    private readonly state$: Observable<State>;

    constructor(initialState: State) {
        this.actions$ = new Subject<Action>();
        this.state$ = this.actions$.pipe(
            scan((state, action) => {
                const newState = action(state);
                return newState;
            }, initialState),
            distinctUntilChanged(),
            share(),
        );
        this.state$.subscribe((state) => console.log('state: ', state));
    }

    public select<SelectionT>(selector: Selector<SelectionT>): Observable<SelectionT> {
        return this.state$.pipe(map(selector), distinctUntilChanged(_.isEqual));
    }

    public dispatch(action: Action): void {
        this.actions$.next((state) => produce(state, action));
    }
}
