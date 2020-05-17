declare module 'to-vfile' {
    import { VFile } from "vfile";
    const vfile: {
        readSync: (fileName: string) => VFile;
    };
    export default vfile;
}