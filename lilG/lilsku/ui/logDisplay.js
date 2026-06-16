
// 日志显示功能

/**
 * 初始化日志区域，返回 log 函数
 * @param {HTMLElement} logContainer - 日志输出容器
 * @returns {Function} log(msg, type)
 */
export function createLogger(logContainer) {
    return function log(msg, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
    };
}
