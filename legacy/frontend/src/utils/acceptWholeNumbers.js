export const acceptWholeNumbers = (e) => {
    if (e.target?.name == 'amount') {
        return e.target.value > -1 && e.target.value;
    }
    const value = Math.floor(e.target.value);
    return value == 0 ? "" : value;
}