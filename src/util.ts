export function disjoint<T>(a: Set<T>, b: Set<T>): boolean {
    return [...a].every((x) => !b.has(x));
}

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
    return str
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/ /g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

export function titleize(str: string): string {
    if (str.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
        return str;
    }
    return str.split('-').map((part) => part.charAt(0).toUpperCase() + part.substring(1)).join(' ');
}

export function memoize<I, O>(fn: (x: I) => O): (x: I) => O {
    const cache = new Map<I, O>();
    return (x: I): O => {
        const cached = cache.get(x);
        if (cache.has(x) && cached) {
            return cached;
        } else {
            const computed = fn(x);
            cache.set(x, computed);
            return computed;
        }
    };
}

export function assertNever(_x: never): never {
    throw new Error('Assert never');
}
