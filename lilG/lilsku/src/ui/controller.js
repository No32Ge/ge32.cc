
// 此文件负责UI交互，但主要逻辑仍留在app.js中，我们仅提供工具函数，如初始化折叠、全屏、星星等
import { lsGet, lsSet } from '../utils/storage.js';
import { LK_MAPPING_COLLAPSED, LK_COLOR_COLLAPSED, LK_CODE_COLLAPSED, LK_DEDUP_COLLAPSED, LK_AI_COLLAPSED } from '../config/manager.js';

export function initCollapse(toggle, icon, wrapper, cls, key) {
    const saved = lsGet(key, false);
    wrapper.className = saved ? 'collapsed-content' : cls;
    icon.className = saved ? 'fa-solid fa-chevron-right text-gray-400' : 'fa-solid fa-chevron-down text-gray-400';
    toggle.addEventListener('click', () => {
        const now = wrapper.classList.contains(cls);
        wrapper.className = now ? 'collapsed-content' : cls;
        icon.className = now ? 'fa-solid fa-chevron-right text-gray-400' : 'fa-solid fa-chevron-down text-gray-400';
        lsSet(key, now);
        // 编辑器刷新在外部处理
    });
}

export function toggleFullscreen(card, editor, btn) {
    const is = card.classList.contains('fullscreen-card');
    card.classList.toggle('fullscreen-card');
    btn.innerHTML = is ? '<i class="fa-solid fa-expand"></i>' : '<i class="fa-solid fa-compress"></i>';
    if (editor) setTimeout(() => { editor.refresh(); editor.setSize('100%', is ? 'auto' : '100%'); }, 100);
}

export function createStars(containerId) {
    const c = document.getElementById(containerId);
    if (!c) return;
    const colors = ['#60a5fa', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#f87171', '#38bdf8', '#fb923c'];
    for (let i = 0; i < 150; i++) {
        const s = document.createElement('div');
        s.className = 'star';
        const size = Math.random() * 2.5 + 1;
        s.style.width = s.style.height = size + 'px';
        s.style.left = Math.random() * 100 + '%';
        s.style.top = Math.random() * 100 + '%';
        s.style.setProperty('--duration', Math.random() * 3 + 2 + 's');
        s.style.setProperty('--delay', Math.random() * 5 + 's');
        s.style.background = colors[Math.floor(Math.random() * colors.length)];
        c.appendChild(s);
    }
}
