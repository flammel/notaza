"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const repeat_string_1 = __importDefault(require("repeat-string"));
function pad(value, level) {
    const lineFeed = '\n';
    const space = ' ';
    const tabSize = 4;
    const values = value.split(lineFeed);
    let index = values.length;
    const padding = repeat_string_1.default(space, level * tabSize);
    while (index--) {
        if (values[index].length !== 0) {
            values[index] = padding + values[index];
        }
    }
    return values
        .join(lineFeed);
}
function customStringify() {
    const compiler = this.Compiler;
    const visitors = compiler.prototype.visitors;
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
        const children = node.children;
        const length = children.length;
        const values = [];
        let index = -1;
        let value;
        let indent;
        while (++index < length) {
            values[index] = self.visit(children[index], node);
        }
        value = values.join(spread ? blank : lineFeed);
        if (typeof checked === 'boolean') {
            // Note: I’d like to be able to only add the space between the check and
            // the value, but unfortunately github does not support empty list-items
            // with a checkbox :(
            value =
                leftSquareBracket +
                    (checked ? lowercaseX : space) +
                    rightSquareBracket +
                    space +
                    value;
        }
        indent = ceil((marker.length + 1) / tabSize) * tabSize;
        return value
            ? marker + space + pad(value, indent / tabSize).slice(indent)
            : marker;
    };
}
const plugin = customStringify;
exports.default = plugin;
//# sourceMappingURL=util.js.map