/* eslint-disable @typescript-eslint/camelcase */
declare module 'markdown-it-front-matter' {
    import * as MarkdownIt from 'markdown-it';
    const front_matter_plugin: MarkdownIt.PluginWithParams;
    export default front_matter_plugin;
}
