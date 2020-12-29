export interface QueryChangeEvent {
    type: 'queryChange';
    query: string;
}
export interface SaveClickEvent {
    type: 'saveClick';
    filename: string;
    content: string;
}

export type AppEvent = QueryChangeEvent | SaveClickEvent;
