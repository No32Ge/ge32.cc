
// ============== 数据去重功能 ==============
(function() {
    const { $, esc, lsGet, lsSet, log, showToastDedup, columnLetter } = window;

    function getDedupFields() {
        const saved = lsGet(window.LK_DEDUP_FIELDS, window.DEFAULT_DEDUP_FIELDS);
        if (!saved || typeof saved !== 'object') return { ...window.DEFAULT_DEDUP_FIELDS };
        return {
            inputField: saved.inputField || window.DEFAULT_DEDUP_FIELDS.inputField,
            groupField: saved.groupField || window.DEFAULT_DEDUP_FIELDS.groupField,
            outputField: saved.outputField || window.DEFAULT_DEDUP_FIELDS.outputField,
            mode: saved.mode || window.DEFAULT_DEDUP_FIELDS.mode
        };
    }

    function saveDedupFields() {
        lsSet(window.LK_DEDUP_FIELDS, {
            inputField: window.dedupInputField ? window.dedupInputField.value.trim() : '',
            groupField: window.dedupGroupField ? window.dedupGroupField.value.trim() : '',
            outputField: window.dedupOutputField ? window.dedupOutputField.value.trim() : '',
            mode: window.dedupMode ? window.dedupMode.value : 'letter'
        });
    }

    function loadDedupFieldsToUI() {
        const fields = getDedupFields();
        if (window.dedupInputField) window.dedupInputField.value = fields.inputField || '';
        if (window.dedupGroupField) window.dedupGroupField.value = fields.groupField || '';
        if (window.dedupOutputField) window.dedupOutputField.value = fields.outputField || '去重后值';
        if (window.dedupMode) window.dedupMode.value = fields.mode || 'letter';
    }

    function resetDedupFieldsToDefault() {
        const def = { ...window.DEFAULT_DEDUP_FIELDS };
        if (window.dedupInputField) window.dedupInputField.value = def.inputField;
        if (window.dedupGroupField) window.dedupGroupField.value = def.groupField;
        if (window.dedupOutputField) window.dedupOutputField.value = def.outputField;
        if (window.dedupMode) window.dedupMode.value = def.mode;
        saveDedupFields();
        updateDedupFieldHints();
        updateDedupReadyStatus();
        log('数据去重字段已重置为默认值', 'info');
    }

    function getAllAvailableColumns() {
        const cols = new Set(window.allColumns);
        if (window.processedData.length > 0) {
            Object.keys(window.processedData[0]).forEach(k => {
                if (!k.startsWith('_')) cols.add(k);
            });
        }
        return Array.from(cols);
    }

    function updateDedupDatalist() {
        const allCols = getAllAvailableColumns();
        window.dedupColumnsList.innerHTML = allCols.map(c => `<option value="${esc(c)}">`).join('');
    }

    function updateDedupFieldHints() {
        const allCols = getAllAvailableColumns();
        const check = (el, hint, isNewCol = false) => {
            if (!el || !hint) return;
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
                } else if (window.processedData.length > 0) {
                    hint.textContent = '❌ 不存在';
                    hint.style.color = '#f87171';
                } else {
                    hint.textContent = '⏳ 等待处理';
                    hint.style.color = '#64748b';
                }
            }
        };
        check(window.dedupInputField, window.dedupInputHint);
        check(window.dedupGroupField, window.dedupGroupHint);
        check(window.dedupOutputField, window.dedupOutputHint, true);
    }

    function updateDedupReadyStatus() {
        const allCols = getAllAvailableColumns();
        const input = window.dedupInputField ? window.dedupInputField.value.trim() : '';
        const group = window.dedupGroupField ? window.dedupGroupField.value.trim() : '';
        const output = window.dedupOutputField ? window.dedupOutputField.value.trim() : '';
        const allSet = input && group && output;
        let allExist = false;
        if (allSet && window.processedData.length > 0) allExist = [input, group].every(f => allCols.includes(f));

        const dot = window.dedupReadyDot;
        const text = window.dedupReadyText;
        const runBtn = window.dedupRunBtn;

        if (window.processedData.length > 0 && allSet && allExist) {
            dot.className = 'dedup-ready-indicator ready';
            text.textContent = '可执行去重';
            runBtn.disabled = false;
        } else if (window.processedData.length > 0 && allSet && !allExist) {
            dot.className = 'dedup-ready-indicator';
            text.textContent = '字段不存在';
            runBtn.disabled = true;
        } else if (window.processedData.length === 0) {
            dot.className = 'dedup-ready-indicator';
            text.textContent = '等待变体组处理';
            runBtn.disabled = true;
        } else {
            dot.className = 'dedup-ready-indicator';
            text.textContent = '请设置字段';
            runBtn.disabled = true;
        }
    }

    function runDedup() {
        const data = window.processedData;
        if (!data || !data.length) {
            log('❌ 请先执行“变体组处理”', 'error');
            return;
        }
        const inputField = window.dedupInputField ? window.dedupInputField.value.trim() : '';
        const groupField = window.dedupGroupField ? window.dedupGroupField.value.trim() : '';
        const outputField = window.dedupOutputField ? window.dedupOutputField.value.trim() : '';
        const mode = window.dedupMode ? window.dedupMode.value : 'letter';

        if (!inputField || !groupField || !outputField) {
            log('❌ 请填写所有字段', 'error');
            return;
        }
        const allCols = getAllAvailableColumns();
        if (!allCols.includes(inputField)) { log(`❌ 输入字段 "${inputField}" 不存在`, 'error'); return; }
        if (!allCols.includes(groupField)) { log(`❌ 分组字段 "${groupField}" 不存在`, 'error'); return; }

        // 清理旧列
        if (window.lastDedupColName && window.lastDedupColName !== outputField) {
            data.forEach(row => delete row[window.lastDedupColName]);
            log(`🧹 已移除旧去重列 "${window.lastDedupColName}"`, 'info');
        }

        const suffixFn = (index) => {
            if (mode === 'number') return String(index + 1);
            return columnLetter(index);
        };

        const groupMap = new Map();
        data.forEach((row, i) => groupMap.has(row[groupField]) ? groupMap.get(row[groupField]).push(i) : groupMap.set(row[groupField], [i]));

        let groupsModified = 0, totalRowsModified = 0;
        const newValues = new Array(data.length).fill(null);

        for (const [gid, indices] of groupMap.entries()) {
            if (indices.length <= 1) {
                indices.forEach(i => newValues[i] = String(data[i][inputField] || '').trim());
                continue;
            }
            // 收集本组内所有非空 input 值
            const vals = indices.map(i => String(data[i][inputField] || '').trim());
            const uniqueVals = [...new Set(vals)];
            if (uniqueVals.length === indices.length) {
                indices.forEach(i => newValues[i] = String(data[i][inputField] || '').trim());
                continue;
            }
            groupsModified++;
            // 按值分组，并在每个值内按顺序加后缀
            const valueGroups = new Map();
            indices.forEach(i => {
                const val = String(data[i][inputField] || '').trim();
                if (!valueGroups.has(val)) valueGroups.set(val, []);
                valueGroups.get(val).push(i);
            });
            for (const [val, rowIndices] of valueGroups.entries()) {
                rowIndices.sort((a, b) => a - b);
                rowIndices.forEach((rowIdx, order) => {
                    const suffix = suffixFn(order);
                    const newVal = val ? `${val} ${suffix}` : suffix;
                    newValues[rowIdx] = newVal;
                    if (String(data[rowIdx][inputField] || '').trim() !== newVal) totalRowsModified++;
                });
            }
        }

        data.forEach((row, i) => {
            if (newValues[i] !== null) row[outputField] = newValues[i];
        });

        window.processedData = data;
        window.lastDedupColName = outputField;
        lsSet('last_dedup_col_name', outputField);
        window.dedupStatsArea.innerHTML = `
            <span class="dedup-stat">📊 总行: ${data.length}</span>
            <span class="dedup-stat">🔁 重复组: ${groupsModified}</span>
            <span class="dedup-stat">✏️ 去重行: ${totalRowsModified}</span>
            <span class="dedup-stat">🆕 新列: "${outputField}"</span>
        `;
        log(`✅ 数据去重完成，新增列 "${outputField}"，修改 ${totalRowsModified} 行`, 'success');
        showToastDedup('✅ 去重列已添加，请导出');
        updateDedupFieldHints();
        updateDedupReadyStatus();
        window.dataStatus.textContent = `✅ 已去重，含列 "${outputField}"`;
    }

    window.getDedupFields = getDedupFields;
    window.saveDedupFields = saveDedupFields;
    window.loadDedupFieldsToUI = loadDedupFieldsToUI;
    window.resetDedupFieldsToDefault = resetDedupFieldsToDefault;
    window.getAllAvailableColumns = getAllAvailableColumns;
    window.updateDedupDatalist = updateDedupDatalist;
    window.updateDedupFieldHints = updateDedupFieldHints;
    window.updateDedupReadyStatus = updateDedupReadyStatus;
    window.runDedup = runDedup;
})();
