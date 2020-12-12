// https://www.sigmacomputing.com/blog/writing-a-parser-combinator-from-scratch-in-typescript/

export type Token = { type: 'keyValue'; key: string; value: string } | { type: 'header'; header: string };
type ParseResult = { type: 'success'; tokens: Token[] } | { type: 'error'; error: string };
export function parse(lines: string[]): ParseResult {
    const tokens: Token[] = [];
    for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];

        if (line === '') {
            continue;
        }

        const headerMatch = line.match(/^\[\[([a-z]+)\]\]/);
        if (headerMatch) {
            tokens.push({ type: 'header', header: headerMatch[1] });
            continue;
        }

        const dateMatch = line.match(/^([a-z]+) = ([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z)$/);
        if (dateMatch) {
            tokens.push({ type: 'keyValue', key: dateMatch[1], value: dateMatch[2] });
            continue;
        }

        const singleMatch = line.match(/^([a-z]+) = (?:"([^"]*)"|'([^']*)')$/);
        if (singleMatch) {
            tokens.push({ type: 'keyValue', key: singleMatch[1], value: singleMatch[2] ?? singleMatch[3] });
            continue;
        }

        const multiStartMatch = line.match(/^([a-z]+) = '''/);
        if (multiStartMatch) {
            const key = multiStartMatch[1];
            const sliced = line.slice(multiStartMatch[0].length);
            if (sliced.endsWith("'''")) {
                tokens.push({ type: 'keyValue', key, value: sliced.slice(0, -3) });
                continue;
            }
            const values = [];
            if (sliced.trim().length > 0) {
                values.push(sliced);
            }
            idx++;
            for (; idx < lines.length; idx++) {
                if (lines[idx].endsWith("'''")) {
                    values.push(lines[idx].slice(0, -3));
                    break;
                } else {
                    values.push(lines[idx]);
                }
            }
            tokens.push({ type: 'keyValue', key, value: values.join('\n') });
            continue;
        }

        return { type: 'error', error: `No matcher for line ${idx}: ${line}` };
    }
    return { type: 'success', tokens };
}
