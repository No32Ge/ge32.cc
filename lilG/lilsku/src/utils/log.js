
let logArea = null;

export function setLogArea(element) {
    logArea = element;
}

export function log(msg, type = 'info') {
    if (!logArea) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logArea.appendChild(entry);
    logArea.scrollTop = logArea.scrollHeight;
}

export function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast-dedup';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
}
