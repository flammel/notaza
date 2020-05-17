import { Store, Dispatchable } from './types';

type Task = (done: () => void) => void;
interface Queue {
    push: (task: Task) => void;
}
function makeQueue(): Queue {
    let running = 0;
    const queue: Task[] = [];
    const run = (task: Task): void => {
        running++;
        task(() => {
            running--;
            const next = queue.shift();
            if (next) {
                run(next);
            }
        })
    }
    return {
        push(task) {
            running > 0 ? queue.push(task) : run(task);
        }
    }
}

export function makeStore<StateType, ActionType>(
    initialState: StateType,
    reducer: (state: StateType, action: ActionType) => StateType
): Store<StateType, ActionType> {
    let state = initialState;
    const listeners: Array<(state: StateType) => void> = [];
    const queue = makeQueue();
    const dispatch = (action: Dispatchable<StateType, ActionType>) => {
        queue.push(done => {
            if (typeof action === 'function') {
            } else {
                const actionResult = reducer(state, action);
                if (actionResult !== state) {
                    state = actionResult;
                    for (const listener of listeners) {
                        listener(state);
                    }
                }
                done();
            }
        });
    };
    return {
        dispatch,
        subscribe(listener) {
            listeners.push(listener);
        },
    };
}
