import { Subject } from 'rxjs';

export interface RawPage {
    id: PageId;
    title: PageTitle;
    children: RawBlock[];
}

export interface RawBlock {
    content: string;
    children: RawBlock[];
}
export type PageId = string;
export type PageTitle = string;

abstract class BlockParent {
    public children: Block[] = [];
    public abstract onChange(message: string): void;

    public prependChild(content: string): Block {
        const block = new Block({ content, children: [] }, this);
        this.children.splice(0, 0, block);
        this.onChange('prependChild');
        return block;
    }

    public appendChild(content: string): Block {
        const block = new Block({ content, children: [] }, this);
        this.children.push(block);
        this.onChange('appendChild');
        return block;
    }

    public insertChild(content: string, after?: Block): Block {
        const block = new Block({ content, children: [] }, this);
        if (after === undefined) {
            this.children.push(block);
        } else {
            const refIndex = this.children.indexOf(after);
            if (refIndex >= 0) {
                this.children.splice(refIndex + 1, 0, block);
            } else {
                this.children.push(block);
            }
        }
        this.onChange('insertChild');
        return block;
    }

    public removeChild(child: Block): void {
        const index = this.children.indexOf(child);
        if (index >= 0) {
            this.children.splice(index, 1);
        }
        this.onChange('removeChild');
    }
}

export class Block extends BlockParent {
    private readonly parent: BlockParent | undefined;
    private content: string;

    constructor(rawBlock: RawBlock, parent: BlockParent | undefined) {
        super();
        this.content = rawBlock.content;
        this.children = rawBlock.children.map((child) => new Block(child, this));
        this.parent = parent;
    }

    public onChange(message: string): void {
        this.parent?.onChange(message);
    }

    public setContent(content: string): void {
        if (content !== this.content) {
            this.content = content;
            this.onChange('setContent');
        }
    }

    public getContent(): string {
        return this.content;
    }

    public getParent(): BlockParent | undefined {
        return this.parent;
    }

    public getPrev(): Block | undefined {
        const parent = this.parent;
        if (parent === undefined) {
            return undefined;
        }
        const index = parent.children.indexOf(this);
        if (index < 1) {
            return undefined;
        }
        return parent.children[index - 1];
    }

    public getNext(): Block | undefined {
        if (this.children.length > 0) {
            return this.children[0];
        }
        const parent = this.parent;
        if (parent === undefined) {
            return undefined;
        }
        const index = parent.children.indexOf(this);
        if (index < 1) {
            return undefined;
        }
        return parent.children[index - 1];
    }

    public flatten(): Block[] {
        return [this, ...this.children.flatMap((child) => child.flatten())];
    }
}

export class Page extends BlockParent {
    public readonly changed$ = new Subject<string>();
    public readonly id: PageId;
    private title: PageTitle;
    private changeNotificationPending = false;

    constructor(rawPage: RawPage) {
        super();
        this.id = rawPage.id;
        this.title = rawPage.title;
        this.children = rawPage.children.map((child) => new Block(child, this));
    }

    public getTitle(): string {
        return this.title;
    }

    public setTitle(title: string): void {
        if (title !== this.title) {
            this.title = title;
            this.onChange('title');
        }
    }

    public appendBlock(block: Block): void {
        this.children.push(block);
    }

    public onChange(change: string): void {
        if (!this.changeNotificationPending) {
            this.changeNotificationPending = true;
            setTimeout(() => {
                this.changeNotificationPending = false;
                this.changed$.next(change);
            }, 0);
        }
    }

    public getFlatBlocks(): Block[] {
        return this.children.flatMap((block) => block.flatten());
    }
}
