export function notUndefined<T>(x: T | undefined): x is T {
    return x !== undefined;
}

// https://fettblog.eu/typescript-hasownproperty/
export function hasOwnProperty<X extends {}, Y extends PropertyKey>(
    obj: X | null,
    prop: Y,
): obj is X & Record<Y, unknown> {
    return obj !== null && obj.hasOwnProperty(prop);
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

// https://stackoverflow.com/a/30106551
export function base64EncodeUnicode(str: string): string {
    return btoa(
        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function toSolidBytes(match, p1) {
            return String.fromCharCode(parseInt('0x' + p1, 16));
        }),
    );
}

export function debounce(fn: (param1: string) => void, delay: number): (param1: string) => void {
    let timeoutID: number;
    return (param1: string): void => {
        clearTimeout(timeoutID);
        timeoutID = window.setTimeout(() => fn(param1), delay);
    };
}

export function withoutExtension(filename: string): string {
    return filename.split('.').slice(0, -1).join('.');
}

export function urlize(str: string): string {
    return str.toLowerCase().replace(/ /g, '-');
}
