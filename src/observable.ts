export type Subscriber<T> = (value: T) => void;
export interface Observable<T> {
    next: (nextValue: T) => void;
    subscribe: (subscriber: Subscriber<T>) => void;
}

export function observable<T>(): Observable<T> {
    const subscriptions: Subscriber<T>[] = [];
    return {
        next: (nextValue): void => {
            for (const subscription of subscriptions) {
                subscription(nextValue);
            }
        },
        subscribe: (subscriber): void => {
            subscriptions.push(subscriber);
        },
    };
}
