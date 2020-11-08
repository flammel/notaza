export function notUndefined<T>(x: T | undefined): x is T {
    return x !== undefined;
}

// https://fettblog.eu/typescript-hasownproperty/
export function hasOwnProperty<X extends {}, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
    return obj.hasOwnProperty(prop);
}

// https://stackoverflow.com/a/30106551
export function base64DecodeUnicode(str: string): string {
    return decodeURIComponent(
        atob(str)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join(''),
    );
}
