const visit = require('unist-util-visit')
const vfile = require('to-vfile');
const report = require('vfile-reporter');
const unified = require('unified');
const parse = require('remark-parse');
const stringify = require('remark-stringify');
const frontmatter = require('remark-frontmatter');
const fs = require('fs');
const path = require('path');
const pad = require('./pad');
const yaml = require('yaml');
const builder = require('unist-builder');
const visitWithParents = require('unist-util-visit-parents');

function getFrontmatter(tree) {
    for (const child of tree.children) {
        if (child.type === 'yaml') {
            return child;
        }
    }
    return undefined;
}

function addCreationDate() {
    return function transformer(tree) {
        const node = getFrontmatter(tree);
        const parsed = yaml.parse(node.value);
        if (!parsed.created) {
            parsed.created = '2020-05-15 18:13';
        }
        node.value = yaml.stringify(parsed).trim();
    }
}

function indentListWithFourSpaces() {
    const Compiler = this.Compiler
    const visitors = Compiler.prototype.visitors
    visitors.listItem = function listItem(node) {
        var lineFeed = '\n'
        var space = ' '
        var leftSquareBracket = '['
        var rightSquareBracket = ']'
        var lowercaseX = 'x'
        var ceil = Math.ceil
        var blank = lineFeed + lineFeed
        var tabSize = 4
        var self = this
        var marker = "*"
        var spread = node.spread == null ? true : node.spread
        var checked = node.checked
        var children = node.children
        var length = children.length
        var values = []
        var index = -1
        var value
        var indent
     
        while (++index < length) {
          values[index] = self.visit(children[index], node)
        }
      
        value = values.join(spread ? blank : lineFeed)
      
        if (typeof checked === 'boolean') {
          // Note: I’d like to be able to only add the space between the check and
          // the value, but unfortunately github does not support empty list-items
          // with a checkbox :(
          value =
            leftSquareBracket +
            (checked ? lowercaseX : space) +
            rightSquareBracket +
            space +
            value
        }
      
        indent = ceil((marker.length + 1) / tabSize) * tabSize
    
        return value
          ? marker + space + pad(value, indent / tabSize).slice(indent)
          : marker
      }
}

const pages = new Map();
const links = new Map();

function treeWithoutBacklinks(tree) {
    const newChildren = [];
    let inBacklinks = false;
    for (const child of tree.children) {
        if (child.type === 'html' && child.value === startCommentValue) {
            inBacklinks = true;
        } else if (child.type === 'html' && child.value === endCommentValue) {
            inBacklinks = false;
        } else if (!inBacklinks) {
            newChildren.push(child);
        }
    }
    return {...tree, children: newChildren};
}

function extractInternalLinks() {
    return function transformer(tree, file) {
        visitWithParents(treeWithoutBacklinks(tree), 'link', (node, ancestors) => {
            console.log(ancestors);
            if (node.url.indexOf('./') === 0) {
                const targetFileName = node.url.substring(2);
                const existing = links.get(targetFileName);
                if (existing instanceof Set) {
                    existing.add(file.basename);
                } else {
                    links.set(targetFileName, new Set([file.basename]));
                }
            }
        })
    }
}
function addMdToInternalLinks() {
    return function transformer(tree) {
        visit(tree, 'link', (node) => {
            if (node.url.startsWith('./') && !node.url.endsWith('.md')) {
                node.url = node.url + '.md';
            }
        })
    }
}

function extractTitle() {
    return function transformer(tree, file) {
        const node = getFrontmatter(tree);
        const parsed = yaml.parse(node.value);
        if (parsed.title) {
            pages.set(file.basename, parsed.title);
        }
    }
}

function writeInternalLinks() {
    return function transformer(tree) {
        visit(tree, 'link', (node) => {
            if (node.url.indexOf('./') === 0) {
                const targetFileName = node.url.substring(2);
                const title = pages.get(targetFileName) || targetFileName;
                node.children = [{
                    type: 'text',
                    value: title
                }]
            }
        })
    }
}

const startCommentValue = '<!-- notaza backlinks start -->';
const endCommentValue = '<!-- notaza backlinks end -->';

function backlinkNodes(backlinks) {
    const u = builder;
    return [
        u('html', {value: startCommentValue}),
        u('heading', {depth: 2}, [u('text', 'Backlinks')]),
        u('list', {ordered: false}, 
            backlinks.map(link => 
                u('listItem', [u('link', {url: './' + link}, [u('text', pages.has(link) ? pages.get(link) : link)])])
            )
        ),
        u('html', {value: endCommentValue})
    ];
}

function addBacklinks() {
    return function transformer(tree, file) {
        const backlinks = links.has(file.basename) ? [...links.get(file.basename)] : [];
        tree.children = [...treeWithoutBacklinks(tree).children, ...backlinkNodes(backlinks)];
    }
}

function addTitleAsHeadline() {
    return function transformer(tree) {
        const node = getFrontmatter(tree);
        const parsed = yaml.parse(node.value);
        if (parsed.title) {
            if (tree.children[1] && tree.children[1].type !== 'heading') {
                const u = builder;
                const headline = u('heading', {depth: 1}, [u('text', parsed.title)]);
                tree.children.splice(1, 0, headline);
            }
        }
    }
}

function processFileExtract(filePath) {
    unified()
    .use(parse)
    .use(stringify)
    .use(frontmatter, ['yaml'])
    .use(extractTitle)
    .use(extractInternalLinks)
    .process(vfile.readSync(filePath));
}

function processFileWrite(filePath) {
    unified()
    .use(parse)
    .use(stringify)
    .use(indentListWithFourSpaces)
    .use(frontmatter, ['yaml'])
    .use(addCreationDate)
    .use(addMdToInternalLinks)
    .use(addBacklinks)
    .use(addTitleAsHeadline)
    .use([
        require('remark-lint'),
        [require('remark-lint-unordered-list-marker-style'), '*']
    ])
    .use(writeInternalLinks)
    .process(vfile.readSync(filePath), (err, file) => {
        // console.log(String(file));
        fs.promises.writeFile(file.path, String(file));
        // console.error(report(err || file))
    });
}

async function processDir(dirPath) {
    const dirEntries = await fs.promises.readdir(dirPath);
    for await (const dirEntry of dirEntries) {
        const entryPath = path.join(dirPath, dirEntry);
        const stat = await fs.promises.stat(entryPath);
        if (stat.isFile()) {
            processFileExtract(entryPath);
        }
    }
    for await (const dirEntry of dirEntries) {
        const entryPath = path.join(dirPath, dirEntry);
        const stat = await fs.promises.stat(entryPath);
        if (stat.isFile()) {
            processFileWrite(entryPath);
        }
    }
}

processDir(process.argv[2]);
