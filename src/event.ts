export interface QueryChangeEvent {
    type: 'queryChange';
    query: string;
}
export interface EditClickEvent {
    type: 'editClick';
    filename: string;
}
export interface SaveClickEvent {
    type: 'saveClick';
    filename: string;
    content: string;
}
export interface CancelClickEvent {
    type: 'cancelClick';
    filename: string;
}

export type AppEvent = QueryChangeEvent | EditClickEvent | SaveClickEvent | CancelClickEvent;
