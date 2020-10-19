export class Bookmark {
    public constructor(
        public readonly id: string,
        public readonly date: string,
        public readonly url: string,
        public readonly title: string,
        public readonly tags: string[],
        public readonly description: string,
    ) {}
}
