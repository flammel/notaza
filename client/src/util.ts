import { PageId, BlockId, AbsoluteBlockId } from './store/state';

function padLeadingZero(x: number): string {
    return x.toString().padStart(2, '0');
}

export function notUndefined<T>(x: T | undefined): x is T {
    return x !== undefined;
}

// https://fettblog.eu/typescript-hasownproperty/
export function hasOwnProperty<X extends {}, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
    return obj.hasOwnProperty(prop);
}

export function dateToString(date: Date): string {
    return date.getFullYear() + '-' + padLeadingZero(date.getMonth() + 1) + '-' + padLeadingZero(date.getDate());
}

/**
 * https://stackoverflow.com/a/1349426
 */
export function makeId(): string {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < 16; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

type TreeNode<T> = T & { children: TreeNode<T>[] };
export function mapTree<In, Out>(tree: TreeNode<In>, fn: (node: In) => Out): TreeNode<Out> {
    return {
        ...fn(tree),
        children: tree.children.map((child) => mapTree(child, fn)),
    };
}

export function assertNever(x: never): never {
    throw new Error('Unexpected object: ' + x);
}

export function absoluteBlockId(pageId: PageId, blockId: BlockId): AbsoluteBlockId {
    return { pageId, blockId };
}
