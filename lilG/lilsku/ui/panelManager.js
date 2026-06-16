
// 通用面板折叠/展开和全屏切换管理

/**
 * 初始化可折叠面板
 * @param {HTMLElement} toggleHeader - 点击触发的标题元素
 * @param {HTMLElement} toggleIcon - 指示图标
 * @param {HTMLElement} collapseWrapper - 内容容器
 * @param {string} expandedClass - 展开时的 CSS 类名
 * @param {boolean} initiallyCollapsed - 初始是否折叠
 * @param {Function} onToggle - 切换回调，接收新的折叠状态
 */
export function initCollapse(toggleHeader, toggleIcon, collapseWrapper, expandedClass, initiallyCollapsed, onToggle) {
    const setState = (collapsed) => {
        if (collapsed) {
            collapseWrapper.classList.remove(expandedClass);
            collapseWrapper.classList.add('collapsed-content');
            toggleIcon.className = 'fa-solid fa-chevron-right text-gray-400';
        } else {
            collapseWrapper.classList.remove('collapsed-content');
            collapseWrapper.classList.add(expandedClass);
            toggleIcon.className = 'fa-solid fa-chevron-down text-gray-400';
        }
        if (onToggle) onToggle(collapsed);
    };

    setState(initiallyCollapsed);

    toggleHeader.addEventListener('click', () => {
        const isCollapsed = collapseWrapper.classList.contains('collapsed-content');
        setState(!isCollapsed);
    });
}

/**
 * 全屏切换
 * @param {HTMLElement} card - 卡片元素
 * @param {object} editor - CodeMirror 实例（可选）
 * @param {HTMLElement} btn - 触发按钮
 */
export function toggleFullscreen(card, editor, btn) {
    const isFull = card.classList.contains('fullscreen-card');
    card.classList.toggle('fullscreen-card');
    if (btn) {
        btn.innerHTML = isFull
            ? '<i class="fa-solid fa-expand"></i>'
            : '<i class="fa-solid fa-compress"></i>';
    }
    if (editor) {
        setTimeout(() => {
            editor.refresh();
            editor.setSize('100%', isFull ? 'auto' : '100%');
        }, 100);
    }
}
