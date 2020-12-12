// https://www.sigmacomputing.com/blog/writing-a-parser-combinator-from-scratch-in-typescript/

type Context = Readonly<{
    lines: string[];
    index: number;
}>;
type Success<T> = Readonly<{
    success: true;
    value: T;
    context: Context;
}>;
type Failure = Readonly<{
    success: false;
    expected: string;
    context: Context;
}>;
type Result<T> = Success<T> | Failure;
type Parser<T> = (context: Context) => Result<T>;

function success<T>(context: Context, value: T): Success<T> {
    return { success: true, value, context };
}

function failure(context: Context, expected: string): Failure {
    return { success: false, expected, context };
}

function current(context: Context): string | undefined {
    return context.lines[context.index];
}

function advance(context: Context): Context {
    return { ...context, index: context.index + 1 };
}

export function sequence<T>(parsers: Parser<T>[]): Parser<T[]> {
    return (context): Result<T[]> => {
        const values: T[] = [];
        let currentContext = context;
        for (const parser of parsers) {
            const result = parser(currentContext);
            if (result.success) {
                values.push(result.value);
                currentContext = result.context;
            } else {
                return result;
            }
        }
        return success(currentContext, values);
    };
}

export function many<T>(parser: Parser<T>): Parser<T[]> {
    return (context): Result<T[]> => {
        const values: T[] = [];
        let currentContext = context;
        let result = parser(currentContext);
        while (result.success) {
            values.push(result.value);
            currentContext = result.context;
            result = parser(currentContext);
        }
        return success(currentContext, values);
    };
}

export function oneOf<T>(...parsers: Parser<T>[]): Parser<T> {
    return (context): Result<T> => {
        for (const parser of parsers) {
            const result = parser(context);
            if (result.success) {
                return success(result.context, result.value);
            }
        }
        return failure(context, 'oneOf');
    };
}

export function optional<T>(parser: Parser<T>): Parser<T | null> {
    return (context): Result<T | null> => {
        const result = parser(context);
        if (result.success) {
            return success(result.context, result.value);
        }
        return success(context, null);
    };
}

export function map<S, T>(parser: Parser<S>, fn: (s: S) => T): Parser<T> {
    return (context): Result<T> => {
        const result = parser(context);
        if (result.success) {
            return success(result.context, fn(result.value));
        } else {
            return result;
        }
    };
}

export function tableHeader(tableName: string): Parser<null> {
    return (context): Result<null> => {
        const line = current(context);
        if (typeof line === 'string') {
            const match = line.match(new RegExp('\\[\\[(' + tableName + ')\\]\\]'));
            if (match !== null) {
                return success(advance(context), null);
            }
        }
        return failure(context, 'table ' + tableName);
    };
}

export function dateKeyValue(key: string): Parser<string> {
    return (context): Result<string> => {
        const line = current(context);
        if (typeof line === 'string') {
            const match = line.match(
                new RegExp('^' + key + ' = ([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z)$'),
            );
            if (match !== null) {
                return success(advance(context), match[1]);
            }
        }
        return failure(context, 'date in key ' + key);
    };
}

export function singleLineStringKeyValue(key: string): Parser<string> {
    return (context): Result<string> => {
        const line = current(context);
        if (typeof line === 'string') {
            const singleMatch = line.match(new RegExp('^' + key + " = (?:'''(.*)'''|'([^']*)'|\"([^\"]*)\")$"));
            if (singleMatch !== null) {
                return success(advance(context), singleMatch[1] ?? singleMatch[2] ?? singleMatch[3]);
            }
        }
        return failure(context, 'single line string in key ' + key);
    };
}

export function multiLineStringKeyValue(key: string): Parser<string> {
    return (context): Result<string> => {
        const line = current(context);
        if (typeof line === 'string') {
            const match = line.match(new RegExp('^' + key + " = '''$"));
            if (match !== null) {
                const result = [];
                let index = context.index + 1;
                while (context.lines[index] !== undefined && context.lines[index] !== "'''") {
                    result.push(context.lines[index]);
                    index++;
                }
                if (context.lines[index] === "'''") {
                    return success({ ...context, index: index + 1 }, result.join('\n'));
                }
                return failure({ ...context, index }, "closing '''");
            }
        }
        return failure(context, 'multi line string in key ' + key);
    };
}

export function emptyLine(): Parser<null> {
    return (context): Result<null> => {
        const line = current(context);
        if (line === '') {
            return success(advance(context), null);
        }
        return failure(context, 'empty line');
    };
}
