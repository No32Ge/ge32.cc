
// 简单的 Toast 提示
export function showToast(message, duration = 2200) {
    const toast = document.createElement('div');
    toast.className = 'toast-dedup'; // 可复用样式
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}
