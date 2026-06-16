
// 方案管理面板交互

import { ConfigManager } from '../core/configManager.js';
import { store } from '../core/dataState.js';

export function initConfigPanel({
    configListContainer,
    saveConfigBtn,
    exportConfigBtn,
    importConfigFile,
    getCurrentConfigFn,  // 函数，返回当前全量配置对象
    onApplyConfigFn,    // 应用配置时调用，传入配置对象
    logFn              // 日志输出函数
}) {
    // 渲染方案列表
    function renderConfigList() {
        const configs = ConfigManager.loadConfigs();
        if (!configs.length) {
            configListContainer.innerHTML = '<span class="text-gray-500 text-sm">暂无方案</span>';
            return;
        }
        configListContainer.innerHTML = configs.map((c, i) => `
            <div class="bg-white/5 border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 text-sm">
                <span>📋 ${esc(c.name)}</span>
                <button class="text-blue-400 hover:text-blue-300" data-apply="${i}">应用</button>
                <button class="text-red-400 hover:text-red-300" data-delete="${i}">删除</button>
            </div>`).join('');

        configListContainer.querySelectorAll('[data-apply]').forEach(b => {
            b.addEventListener('click', e => {
                const idx = e.target.dataset.apply;
                const cfg = ConfigManager.loadConfigs()[idx];
                if (cfg) {
                    onApplyConfigFn(cfg);
                    logFn('方案已应用', 'success');
                }
            });
        });

        configListContainer.querySelectorAll('[data-delete]').forEach(b => {
            b.addEventListener('click', e => {
                const cfgs = ConfigManager.loadConfigs();
                cfgs.splice(e.target.dataset.delete, 1);
                ConfigManager.saveConfigs(cfgs);
                renderConfigList();
                logFn('方案已删除', 'info');
            });
        });
    }

    // 辅助转义
    function esc(s) {
        return String(s || '').replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    // 保存方案
    saveConfigBtn.addEventListener('click', () => {
        const name = prompt('方案名称：', store.currentConfigName || '新方案');
        if (!name) return;
        const cfgs = ConfigManager.loadConfigs();
        const cfg = getCurrentConfigFn();
        cfg.name = name;
        const idx = cfgs.findIndex(c => c.name === name);
        if (idx >= 0) cfgs[idx] = cfg;
        else cfgs.push(cfg);
        ConfigManager.saveConfigs(cfgs);
        store.currentConfigName = name;
        renderConfigList();
        logFn('方案已保存', 'success');
    });

    // 导出方案
    exportConfigBtn.addEventListener('click', () => {
        const configs = ConfigManager.loadConfigs();
        const blob = new Blob([JSON.stringify(configs, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'variant_configs.json';
        a.click();
    });

    // 导入方案
    importConfigFile.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const imported = JSON.parse(ev.target.result);
                ConfigManager.saveConfigs(imported);
                renderConfigList();
                logFn('导入成功', 'success');
            } catch {
                logFn('无效JSON', 'error');
            }
            importConfigFile.value = '';
        };
        reader.readAsText(file);
    });

    // 初始渲染
    renderConfigList();
    return { renderConfigList };
}
