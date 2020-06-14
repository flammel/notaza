function leftPad(x) {
    return ('0' + x).substr(-2);
}
export function dateToString(date) {
    return date.getFullYear() + '-' + leftPad(date.getMonth() + 1) + '-' + leftPad(date.getDate());
}
export function dateTimeToString(date) {
    return dateToString(date) + ' ' + leftPad(date.getHours()) + ':' + leftPad(date.getMinutes());
}
/**
 * https://stackoverflow.com/a/1349426
 */
export function makeId() {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < 16; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
//# sourceMappingURL=util.js.map