
// localStorage 封装
export function lsGet(key, def) {
    try {
        const v = localStorage.getItem(key);
        return v !== null ? JSON.parse(v) : def;
    } catch {
        return def;
    }
}

export function lsSet(key, val) {
    try {
        localStorage.setItem(key, JSON.stringify(val));
    } catch {}
}
