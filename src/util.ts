import repeat from 'repeat-string';
import remarkStringify from 'remark-stringify'
import unified from 'unified'
import unist from 'unist'

function pad(value: string, level: number) {
  const lineFeed = '\n'
  const space = ' '
  const tabSize = 4
  const values = value.split(lineFeed)
  let index = values.length
  const padding = repeat(space, level * tabSize)

  while (index--) {
    if (values[index].length !== 0) {
      values[index] = padding + values[index]
    }
  }

  return values
  .join(lineFeed)
}
function customStringify(this: unified.Processor) {
  const compiler = this.Compiler as typeof remarkStringify.Compiler
  const visitors = compiler.prototype.visitors
  visitors.listItem = function listItem(node) {
      const lineFeed = '\n';
      const space = ' ';
      const leftSquareBracket = '[';
      const rightSquareBracket = ']';
      const lowercaseX = 'x';
      const ceil = Math.ceil;
      const blank = lineFeed + lineFeed;
      const tabSize = 4;
      const self = this;
      const marker = "*";
      const spread = node.spread == null ? true : node.spread;
      const checked = node.checked;
      const children = node.children as unist.Node[];
      const length = children.length;
      const values = [];
      let index = -1;
      let value;
      let indent;

      while (++index < length) {
        values[index] = self.visit(children[index], node as unist.Parent)
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
const plugin: unified.Attacher = customStringify;
export default plugin;