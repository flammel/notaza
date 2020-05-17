"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repeat = require("repeat-string");
const lineFeed = '\n';
const space = ' ';
const tabSize = 4;
module.exports = (value, level) => {
    const values = value.split(lineFeed);
    let index = values.length;
    const padding = repeat(space, level * tabSize);
    while (index--) {
        if (values[index].length !== 0) {
            values[index] = padding + values[index];
        }
    }
    return values.join(lineFeed);
};
//# sourceMappingURL=pad.js.map