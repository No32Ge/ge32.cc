
// 颜色去重面板交互

import { ConfigManager } from '../core/configManager.js';
import { store } from '../core/dataState.js';
import { runDedup } from '../services/colorDeduplicator.js';
import { showToast } from './toast.js';
// store 是单例，直接使用
const dataStore = store;

export function initDedupPanel({
    dedupColorTypeField,
    dedupGroupField,
    dedupColorField,
    dedupSkuField,
    dedupNewColField,
    dedupColumnsList,
    dedupRunBtn,
    dedupStatsArea,
    dedupResetFieldsBtn,
    dedupReadyDot,
    dedupReadyText,
    dedupColorTypeHint,
    dedupGroupHint,
    dedupColorHint,
    dedupSkuHint,
    dedupNewColHint,
    dedupIntegrationNote,
    logFn
}) {
    // 保存当前去重字段到配置
    function saveDedupFields() {
        ConfigManager.saveDedupFields({
            colorType: dedupColorTypeField.value.trim(),
            variantGroup: dedupGroupField.value.trim(),
            amazonColor: dedupColorField.value.trim(),
            sku: dedupSkuField.value.trim(),
            newColName: dedupNewColField.value.trim()
        });
    }

    // 更新字段提示
    function updateHints() {
        const allCols = dataStore.getAllAvailableColumns();
        const check = (el, hint, isNewCol = false) => {
            const val = el.value.trim();
            if (!val) {
                hint.textContent = '⚠ 未设置';
                hint.style.color = '#f59e0b';
                return;
            }
            if (isNewCol) {
                if (allCols.includes(val)) {
                    hint.textContent = '⚠ 列名已存在，将被覆盖';
                    hint.style.color = '#f59e0b';
                } else {
                    hint.textContent = '✅ 将新增此列';
                    hint.style.color = '#34d399';
                }
            } else {
                if (allCols.includes(val)) {
                    hint.textContent = '✅ 列存在';
                    hint.style.color = '#34d399';
                } else if (dataStore.processedData.length > 0) {
                    hint.textContent = '❌ 不存在';
                    hint.style.color = '#f87171';
                } else {
                    hint.textContent = '⏳ 等待处理';
                    hint.style.color = '#64748b';
                }
            }
        };
        check(dedupColorTypeField, dedupColorTypeHint);
        check(dedupGroupField, dedupGroupHint);
        check(dedupColorField, dedupColorHint);
        check(dedupSkuField, dedupSkuHint);
        check(dedupNewColField, dedupNewColHint, true);
    }

    // 更新就绪状态
    function updateReadyStatus() {
        const allCols = dataStore.getAllAvailableColumns();
        const f1 = dedupColorTypeField.value.trim();
        const f2 = dedupGroupField.value.trim();
        const f3 = dedupColorField.value.trim();
        const f4 = dedupSkuField.value.trim();
        const newCol = dedupNewColField.value.trim();
        const allSet = f1 && f2 && f3 && f4 && newCol;
        let allExist = false;
        if (allSet && dataStore.processedData.length > 0) {
            allExist = [f1, f2, f3, f4].every(f => allCols.includes(f));
        }

        if (dataStore.processedData.length > 0 && allSet && allExist) {
            dedupReadyDot.className = 'dedup-ready-indicator ready';
            dedupReadyText.textContent = '可执行去重';
            dedupRunBtn.disabled = false;
        } else if (dataStore.processedData.length > 0 && allSet && !allExist) {
            dedupReadyDot.className = 'dedup-ready-indicator';
            dedupReadyText.textContent = '字段不存在';
            dedupRunBtn.disabled = true;
        } else if (dataStore.processedData.length === 0) {
            dedupReadyDot.className = 'dedup-ready-indicator';
            dedupReadyText.textContent = '等待变体组处理';
            dedupRunBtn.disabled = true;
        } else {
            dedupReadyDot.className = 'dedup-ready-indicator';
            dedupReadyText.textContent = '请设置字段';
            dedupRunBtn.disabled = true;
        }
    }

    // 执行去重
    dedupRunBtn.addEventListener('click', () => {
        if (!dataStore.processedData.length) {
            logFn('请先执行“变体组处理”', 'error');
            return;
        }
        const options = {
            colorTypeCol: dedupColorTypeField.value.trim(),
            groupCol: dedupGroupField.value.trim(),
            colorCol: dedupColorField.value.trim(),
            skuCol: dedupSkuField.value.trim(),
            newColName: dedupNewColField.value.trim()
        };

        try {
            // 清理旧去重列
            const lastCol = dataStore.lastDedupColName || ConfigManager.getLastDedupColName();
            if (lastCol && lastCol !== options.newColName) {
                dataStore.processedData.forEach(row => delete row[lastCol]);
                logFn(`🧹 已移除旧去重列 "${lastCol}"`, 'info');
            }

            const { stats } = runDedup(dataStore.processedData, options);

            // 更新状态
            dataStore.setLastDedupColName(options.newColName);
            ConfigManager.saveLastDedupColName(options.newColName);
            dataStore.updateProcessedData(dataStore.processedData); // 触发更新事件

            dedupStatsArea.innerHTML = `
                <span class="dedup-stat">📊 总行: ${stats.totalRows}</span>
                <span class="dedup-stat">🔁 重复组: ${stats.groupsModified}</span>
                <span class="dedup-stat">✏️ 去重行: ${stats.totalRowsModified}</span>
                <span class="dedup-stat">🆕 新列: "${stats.newColName}"</span>
            `;
            dedupIntegrationNote.style.display = 'block';
            logFn(`🎨 颜色去重完成，新增列 "${stats.newColName}"，修改 ${stats.totalRowsModified} 行`, 'success');
            showToast('✅ 去重列已添加，请导出');
            updateHints();
            updateReadyStatus();
        } catch (e) {
            logFn(`❌ 去重失败: ${e.message}`, 'error');
        }
    });

    // 重置字段
    dedupResetFieldsBtn.addEventListener('click', () => {
        const def = ConfigManager.getDefaults().DEDUP_FIELDS;
        dedupColorTypeField.value = def.colorType;
        dedupGroupField.value = def.variantGroup;
        dedupColorField.value = def.amazonColor;
        dedupSkuField.value = dataStore.allColumns.find(c => c.toLowerCase().includes('sku')) || def.sku || '';
        dedupNewColField.value = def.newColName;
        saveDedupFields();
        updateHints();
        updateReadyStatus();
        logFn('🎨 颜色去重字段已重置为默认值', 'info');
    });

    // 自动从 SKU 选择器同步 SKU 字段
    const skuObserver = (skuValue) => {
        if (!dedupSkuField.value.trim() && skuValue) {
            dedupSkuField.value = skuValue;
            saveDedupFields();
            updateHints();
            updateReadyStatus();
        }
    };

    // 监听数据变化
    dataStore.on('rawDataLoaded', () => {
        updateHints();
        updateReadyStatus();
        // 数据加载后，如果 SKU 列已选择，同步到去重 SKU 字段
        const skuEl = document.getElementById('skuColSelect'); // 我们稍后在 app.js 中传入 skuSelect
        // 这里通过外部传入更好，暂时从全局获取
    });

    dataStore.on('dataProcessed', () => {
        updateHints();
        updateReadyStatus();
    });

    // 初始化
    const fields = ConfigManager.getDedupFields();
    dedupColorTypeField.value = fields.colorType || '';
    dedupGroupField.value = fields.variantGroup || '';
    dedupColorField.value = fields.amazonColor || '';
    dedupSkuField.value = fields.sku || '';
    dedupNewColField.value = fields.newColName || '去重后颜色';
    updateHints();
    updateReadyStatus();

    // 输入时保存
    [dedupColorTypeField, dedupGroupField, dedupColorField, dedupSkuField, dedupNewColField].forEach(el => {
        el.addEventListener('input', () => {
            saveDedupFields();
            updateHints();
            updateReadyStatus();
        });
        el.addEventListener('focus', () => {
            // 更新 datalist
            const allCols = dataStore.getAllAvailableColumns();
            dedupColumnsList.innerHTML = allCols.map(c => `<option value="${esc(c)}">`).join('');
        });
    });

    function esc(s) {
        return String(s || '').replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    return { updateHints, updateReadyStatus, syncSku: skuObserver };
}
