
// ============== 工具函数（挂载到 window） ==============
(function() {
    const $ = id => document.getElementById(id);
    const esc = s => String(s || '').replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

    function lsGet(key, def) {
        try {
            const v = localStorage.getItem(key);
            return v !== null ? JSON.parse(v) : def;
        } catch {
            return def;
        }
    }

    function lsSet(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch {}
    }

    function showToastDedup(msg) {
        const toast = document.createElement('div');
        toast.className = 'toast-dedup';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2200);
    }

    function log(msg, type = 'info') {
        const logArea = window.logArea;
        if (!logArea) return;
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logArea.appendChild(entry);
        logArea.scrollTop = logArea.scrollHeight;
    }

    function columnLetter(index) {
        let dividend = index + 1,
            result = '';
        while (dividend > 0) {
            let modulo = (dividend - 1) % 26;
            result = String.fromCharCode(65 + modulo) + result;
            dividend = Math.floor((dividend - 1) / 26);
        }
        return result;
    }

    function createStars() {
        // 星空特效已移除以优化性能
    }

    window.$ = $;
    window.esc = esc;
    window.lsGet = lsGet;
    window.lsSet = lsSet;
    window.showToastDedup = showToastDedup;
    window.log = log;
    window.columnLetter = columnLetter;
    window.createStars = createStars;
})();
