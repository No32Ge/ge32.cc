
// 入口模块 - 重构后的主文件
import { $, esc } from './src/utils/dom.js';
import { setLogArea, log, showToast } from './src/utils/log.js';
import { lsGet, lsSet } from './src/utils/storage.js';
import {
    DEFAULT_COLOR_ENUM, DEFAULT_AI_PROMPT, DEFAULT_DEDUP_FIELDS,
    DEFAULT_MAPPING, DEFAULT_CODE
} from './src/defaults.js';
import {
    getWorkbook, setWorkbook, getCurrentSheetName, setCurrentSheetName,
    getRawData, setRawData, getAllColumns, setAllColumns,
    loadSheet, handleFile
} from './src/core/dataLoader.js';
import { processData } from './src/core/processor.js';
import {
    getStoredColorEnum, saveColorEnumToStorage, getColorColumnName,
    scanColorValues, findUnmappedColors, updateColorUnmappedMini
} from './src/core/colorNormalizer.js';
import { callAI, showAISuggestions } from './src/ai/classifier.js';
import {
    getDedupFields, saveDedupFieldsToStorage, runDedup, columnLetter
} from './src/features/dedup.js';
import {
    LK_COLOR_ENUM, LK_AI_KEY, LK_AI_MODEL, LK_AI_PROMPT,
    LK_COLOR_COLLAPSED, LK_AI_COLLAPSED, LK_MAPPING_COLLAPSED, LK_CODE_COLLAPSED,
    LK_CONFIGS, LK_DEDUP_COLLAPSED, LK_DEDUP_FIELDS,
    loadConfigs, saveConfigs, getCurrentFullConfig, applyConfig, renderConfigList
} from './src/config/manager.js';
import { initCollapse, toggleFullscreen, createStars } from './src/ui/controller.js';

// -------------------- 全局状态 --------------------
let processedData = [];
let lastDedupColName = '';
let codeEditor = null, mappingEditor = null, colorEnumEditor = null;
let currentConfig = { name: '默认方案' };

// -------------------- DOM 引用 --------------------
const fileInput = $('fileInput');
const sheetSelect = $('sheetSelect');
const loadSheetBtn = $('loadSheetBtn');
const skuColSelect = $('skuColSelect');
const parentColSelect = $('parentColSelect');
const mappingContainer = $('mappingEditorContainer');
const codeContainer = $('codeEditorContainer');
const colorEnumContainer = $('colorEnumEditorContainer');
const mappingCard = $('mappingCard');
const codeCard = $('codeCard');
const colorEnumCard = $('colorEnumCard');
const mappingToggleHeader = $('mappingToggleHeader');
const mappingToggleIcon = $('mappingToggleIcon');
const mappingCollapseWrapper = $('mappingCollapseWrapper');
const mappingFullscreenBtn = $('mappingFullscreenBtn');
const colorEnumToggleHeader = $('colorEnumToggleHeader');
const colorEnumToggleIcon = $('colorEnumToggleIcon');
const colorEnumCollapseWrapper = $('colorEnumCollapseWrapper');
const colorEnumFullscreenBtn = $('colorEnumFullscreenBtn');
const codeToggleHeader = $('codeToggleHeader');
const codeToggleIcon = $('codeToggleIcon');
const codeCollapseWrapper = $('codeCollapseWrapper');
const codeFullscreenBtn = $('codeFullscreenBtn');
const runProcessBtn = $('runProcessBtn');
const exportBtn = $('exportResultBtn');
const exportFullCheck = $('exportFullCheckbox');
const exportNewCheck = $('exportNewColsCheckbox');
const dataStatus = $('dataStatus');
const logArea = $('logArea');
const saveConfigBtn = $('saveConfigBtn');
const exportConfigBtn = $('exportConfigBtn');
const importConfigFile = $('importConfigFile');
const resetMappingBtn = $('resetMappingBtn');
const resetCodeBtn = $('resetCodeBtn');
const resetColorEnumBtn = $('resetColorEnumBtn');
const configListContainer = $('configListContainer');
const aiClassifyBtn = $('aiClassifyBtn');
const aiApiKey = $('aiApiKey');
const aiModel = $('aiModel');
const aiPrompt = $('aiPrompt');
const aiSettingsToggle = $('aiSettingsToggle');
const aiSettingsIcon = $('aiSettingsIcon');
const aiSettingsContent = $('aiSettingsContent');
const aiModalContainer = $('aiModalContainer');
const colorUnmappedMini = $('colorUnmappedMini');
const dedupToggleHeader = $('dedupToggleHeader');
const dedupToggleIcon = $('dedupToggleIcon');
const dedupCollapseWrapper = $('dedupCollapseWrapper');
const dedupColorTypeField = $('dedupColorTypeField');
const dedupGroupField = $('dedupGroupField');
const dedupColorField = $('dedupColorField');
const dedupSkuField = $('dedupSkuField');
const dedupNewColField = $('dedupNewColField');
const dedupColumnsList = $('dedupColumnsList');
const dedupRunBtn = $('dedupRunBtn');
const dedupStatsArea = $('dedupStatsArea');
const dedupResetFieldsBtn = $('dedupResetFieldsBtn');
const dedupReadyDot = $('dedupReadyDot');
const dedupReadyText = $('dedupReadyText');
const dedupColorTypeHint = $('dedupColorTypeHint');
const dedupGroupHint = $('dedupGroupHint');
const dedupColorHint = $('dedupColorHint');
const dedupSkuHint = $('dedupSkuHint');
const dedupNewColHint = $('dedupNewColHint');
const dedupIntegrationNote = $('dedupIntegrationNote');

setLogArea(logArea);

// -------------------- 辅助UI函数 --------------------
function getAllAvailableColumns() {
    const cols = new Set(getAllColumns());
    if (processedData.length > 0) {
        Object.keys(processedData[0]).forEach(k => { if (!k.startsWith('_')) cols.add(k); });
    }
    return Array.from(cols);
}

function updateDedupDatalist() {
    const allCols = getAllAvailableColumns();
    dedupColumnsList.innerHTML = allCols.map(c => `<option value="${esc(c)}">`).join('');
}

function updateDedupFieldHints() {
    const allCols = getAllAvailableColumns();
    const check = (el, hint, isNewCol = false) => {
        const val = el.value.trim();
        if (!val) { hint.textContent = '⚠ 未设置'; hint.style.color = '#f59e0b'; return; }
        if (isNewCol) {
            if (allCols.includes(val)) { hint.textContent = '⚠ 列名已存在，将被覆盖'; hint.style.color = '#f59e0b'; }
            else { hint.textContent = '✅ 将新增此列'; hint.style.color = '#34d399'; }
        } else {
            if (allCols.includes(val)) { hint.textContent = '✅ 列存在'; hint.style.color = '#34d399'; }
            else if (processedData.length > 0) { hint.textContent = '❌ 不存在'; hint.style.color = '#f87171'; }
            else { hint.textContent = '⏳ 等待处理'; hint.style.color = '#64748b'; }
        }
    };
    check(dedupColorTypeField, dedupColorTypeHint);
    check(dedupGroupField, dedupGroupHint);
    check(dedupColorField, dedupColorHint);
    check(dedupSkuField, dedupSkuHint);
    check(dedupNewColField, dedupNewColHint, true);
}

function updateDedupReadyStatus() {
    const allCols = getAllAvailableColumns();
    const f1 = dedupColorTypeField.value.trim(), f2 = dedupGroupField.value.trim(),
          f3 = dedupColorField.value.trim(), f4 = dedupSkuField.value.trim();
    const newCol = dedupNewColField.value.trim();
    const allSet = f1 && f2 && f3 && f4 && newCol;
    let allExist = false;
    if (allSet && processedData.length > 0) allExist = [f1, f2, f3, f4].every(f => allCols.includes(f));
    if (processedData.length > 0 && allSet && allExist) {
        dedupReadyDot.className = 'dedup-ready-indicator ready';
        dedupReadyText.textContent = '可执行去重';
        dedupRunBtn.disabled = false;
    } else if (processedData.length > 0 && allSet && !allExist) {
        dedupReadyDot.className = 'dedup-ready-indicator';
        dedupReadyText.textContent = '字段不存在';
        dedupRunBtn.disabled = true;
    } else if (processedData.length === 0) {
        dedupReadyDot.className = 'dedup-ready-indicator';
        dedupReadyText.textContent = '等待变体组处理';
        dedupRunBtn.disabled = true;
    } else {
        dedupReadyDot.className = 'dedup-ready-indicator';
        dedupReadyText.textContent = '请设置字段';
        dedupRunBtn.disabled = true;
    }
}

function saveDedupFields() {
    saveDedupFieldsToStorage({
        colorType: dedupColorTypeField.value.trim(),
        variantGroup: dedupGroupField.value.trim(),
        amazonColor: dedupColorField.value.trim(),
        sku: dedupSkuField.value.trim(),
        newColName: dedupNewColField.value.trim()
    });
}

function loadDedupFieldsToUI() {
    const fields = getDedupFields();
    dedupColorTypeField.value = fields.colorType || '';
    dedupGroupField.value = fields.variantGroup || '';
    dedupColorField.value = fields.amazonColor || '';
    dedupSkuField.value = fields.sku || (skuColSelect.value || '');
    dedupNewColField.value = fields.newColName || '去重后颜色';
}

function resetDedupFieldsToDefault() {
    const def = { ...DEFAULT_DEDUP_FIELDS };
    dedupColorTypeField.value = def.colorType;
    dedupGroupField.value = def.variantGroup;
    dedupColorField.value = def.amazonColor;
    dedupSkuField.value = skuColSelect.value || def.sku || '';
    dedupNewColField.value = def.newColName;
    saveDedupFields();
    updateDedupFieldHints();
    updateDedupReadyStatus();
    log('🎨 颜色去重字段已重置为默认值', 'info');
}

// -------------------- 核心操作函数 --------------------
function updateColorUnmappedMiniWrapper() {
    updateColorUnmappedMini(getRawData(), getAllColumns(), mappingEditor, colorEnumEditor, colorUnmappedMini);
}

function runProcess() {
    const raw = getRawData();
    if (!raw.length) { log('请先加载数据', 'error'); return; }
    const skuCol = skuColSelect.value, parentCol = parentColSelect.value;
    if (!skuCol || !parentCol) { log('请选择SKU和父SKU列', 'error'); return; }
    const mappingJSON = mappingEditor.getValue();
    const codeStr = codeEditor.getValue();
    // 保存颜色枚举
    saveColorEnumFromEditor();

    const result = processData(raw, skuCol, parentCol, mappingJSON, codeStr, getAllColumns(), (res, newCols) => {
        processedData = res;
        dataStatus.textContent = `✅ 已处理 ${processedData.length} 行`;
        updateColorUnmappedMiniWrapper();
        updateDedupDatalist();
        updateDedupFieldHints();
        if (!dedupSkuField.value.trim() && skuCol) { dedupSkuField.value = skuCol; saveDedupFields(); }
        dedupStatsArea.innerHTML = '';
        dedupIntegrationNote.style.display = 'none';
        lastDedupColName = '';
        updateDedupReadyStatus();
    });
    if (result === null) {
        // 错误已记录
    }
}

function exportData() {
    if (!processedData.length) { log('无数据可导出', 'error'); return; }
    const allCols = Object.keys(processedData[0]);
    const newCols = allCols.filter(c => !getAllColumns().includes(c) && !c.startsWith('_'));
    const skuCol = skuColSelect.value;
    let exportCols = [];
    if (exportFullCheck.checked) exportCols = allCols.filter(c => !c.startsWith('_'));
    else exportCols = exportNewCheck.checked ? [skuCol, ...newCols.filter(c => c !== skuCol)] : [skuCol];
    exportCols = exportCols.filter(c => allCols.includes(c));
    const exportRows = processedData.map(row => {
        const obj = {};
        exportCols.forEach(c => obj[c] = row[c] ?? '');
        return obj;
    });
    try {
        const ws = XLSX.utils.json_to_sheet(exportRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "结果");
        XLSX.writeFile(wb, `variant_result_${Date.now()}.xlsx`);
        log(`📎 导出成功（${exportCols.length}列）`, 'success');
    } catch { log('导出失败', 'error'); }
}

function saveColorEnumFromEditor() {
    if (!colorEnumEditor) return;
    try {
        const parsed = JSON.parse(colorEnumEditor.getValue());
        if (parsed && typeof parsed === 'object') saveColorEnumToStorage(parsed);
    } catch {}
}

function loadAISettings() {
    aiApiKey.value = lsGet(LK_AI_KEY, '');
    aiModel.value = lsGet(LK_AI_MODEL, 'deepseek-chat');
    aiPrompt.value = lsGet(LK_AI_PROMPT, DEFAULT_AI_PROMPT);
}

function saveAISettings() {
    lsSet(LK_AI_KEY, aiApiKey.value);
    lsSet(LK_AI_MODEL, aiModel.value);
    lsSet(LK_AI_PROMPT, aiPrompt.value);
}

function initEditors() {
    mappingEditor = CodeMirror(mappingContainer, {
        value: DEFAULT_MAPPING,
        mode: { name: 'javascript', json: true },
        theme: 'material-darker',
        lineNumbers: true,
        tabSize: 2
    });
    mappingEditor.setSize('100%', '100px');

    colorEnumEditor = CodeMirror(colorEnumContainer, {
        value: JSON.stringify(getStoredColorEnum(), null, 2),
        mode: { name: 'javascript', json: true },
        theme: 'material-darker',
        lineNumbers: true,
        tabSize: 2
    });
    colorEnumEditor.setSize('100%', '220px');
    colorEnumEditor.on('change', () => {
        saveColorEnumFromEditor();
        updateColorUnmappedMiniWrapper();
    });

    codeEditor = CodeMirror(codeContainer, {
        value: DEFAULT_CODE,
        mode: 'javascript',
        theme: 'material-darker',
        lineNumbers: true,
        tabSize: 2,
        viewportMargin: Infinity
    });
    codeEditor.setSize('100%', '420px');
}

// 加载工作表回调
function loadSheetCallback() {
    loadSheet(
        getCurrentSheetName(),
        sheetSelect,
        skuColSelect,
        parentColSelect,
        dedupSkuField,
        saveDedupFields,
        updateDedupDatalist,
        updateDedupFieldHints,
        updateDedupReadyStatus,
        dataStatus,
        dedupStatsArea,
        dedupIntegrationNote,
        (name) => { lastDedupColName = name; }
    );
    // 清空 processedData
    processedData = [];
    updateDedupDatalist();
    updateDedupFieldHints();
    updateDedupReadyStatus();
}

// 去重执行
function runColorDedup() {
    const colorTypeCol = dedupColorTypeField.value.trim(),
          groupCol = dedupGroupField.value.trim(),
          colorCol = dedupColorField.value.trim(),
          skuCol = dedupSkuField.value.trim();
    const newColName = dedupNewColField.value.trim();
    const result = runDedup(
        processedData,
        colorTypeCol, groupCol, colorCol, skuCol, newColName,
        lastDedupColName,
        (name) => { lastDedupColName = name; },
        (res, groups, rows, colName) => {
            processedData = res;
            dedupStatsArea.innerHTML = `
                <span class="dedup-stat">📊 总行: ${res.length}</span>
                <span class="dedup-stat">🔁 重复组: ${groups}</span>
                <span class="dedup-stat">✏️ 去重行: ${rows}</span>
                <span class="dedup-stat">🆕 新列: "${colName}"</span>
            `;
            dedupIntegrationNote.style.display = 'block';
            dataStatus.textContent = `✅ 已去重，含列 "${colName}"`;
            updateDedupFieldHints();
            updateDedupReadyStatus();
        }
    );
    if (result === null) {
        // 错误已记录
    }
}

// AI 分类
async function handleAIClassify() {
    saveColorEnumFromEditor();
    const unmapped = findUnmappedColors(getRawData(), getAllColumns(), mappingEditor, colorEnumEditor).map(u => u.display);
    if (!unmapped.length) { alert('没有未映射颜色'); return; }
    aiClassifyBtn.disabled = true;
    const suggestions = await callAI(unmapped, aiApiKey.value, aiModel.value, aiPrompt.value);
    aiClassifyBtn.disabled = false;
    if (suggestions && suggestions.length) {
        showAISuggestions(suggestions, aiModalContainer, colorEnumEditor, saveColorEnumFromEditor, updateColorUnmappedMiniWrapper, log);
    }
}

// 方案应用包装函数
function applyConfigWrapper(cfg) {
    applyConfig(cfg, getAllColumns(), skuColSelect, parentColSelect, mappingEditor, codeEditor, colorEnumEditor, saveColorEnumFromEditor, {
        colorType: dedupColorTypeField,
        group: dedupGroupField,
        color: dedupColorField,
        sku: dedupSkuField,
        newCol: dedupNewColField
    }, updateDedupDatalist, updateDedupFieldHints, updateDedupReadyStatus);
}

// 方案保存
function handleSaveConfig() {
    const name = prompt('方案名称：', currentConfig.name || '新方案');
    if (!name) return;
    const cfgs = loadConfigs();
    const cfg = getCurrentFullConfig(skuColSelect, parentColSelect, mappingEditor, codeEditor, colorEnumEditor, {
        colorType: dedupColorTypeField.value.trim(),
        variantGroup: dedupGroupField.value.trim(),
        amazonColor: dedupColorField.value.trim(),
        sku: dedupSkuField.value.trim(),
        newColName: dedupNewColField.value.trim()
    });
    cfg.name = name;
    const idx = cfgs.findIndex(c => c.name === name);
    if (idx >= 0) cfgs[idx] = cfg;
    else cfgs.push(cfg);
    saveConfigs(cfgs);
    currentConfig.name = name;
    renderConfigList(configListContainer, loadConfigs, applyConfigWrapper, log);
    log('方案已保存', 'success');
}

// -------------------- 初始化 --------------------
function init() {
    createStars('stars');
    initEditors();
    loadAISettings();
    loadDedupFieldsToUI();

    // 折叠初始化
    initCollapse(mappingToggleHeader, mappingToggleIcon, mappingCollapseWrapper, 'expanded-content-mapping', LK_MAPPING_COLLAPSED);
    initCollapse(colorEnumToggleHeader, colorEnumToggleIcon, colorEnumCollapseWrapper, 'expanded-content-color-enum', LK_COLOR_COLLAPSED);
    initCollapse(codeToggleHeader, codeToggleIcon, codeCollapseWrapper, 'expanded-content', LK_CODE_COLLAPSED);

    const dedupSaved = lsGet(LK_DEDUP_COLLAPSED, false);
    dedupCollapseWrapper.className = dedupSaved ? 'collapsed-content' : 'expanded-content-dedup';
    dedupToggleIcon.className = dedupSaved ? 'fa-solid fa-chevron-right text-gray-400' : 'fa-solid fa-chevron-down text-gray-400';
    dedupToggleHeader.addEventListener('click', () => {
        const now = dedupCollapseWrapper.classList.contains('expanded-content-dedup');
        dedupCollapseWrapper.className = now ? 'collapsed-content' : 'expanded-content-dedup';
        dedupToggleIcon.className = now ? 'fa-solid fa-chevron-right text-gray-400' : 'fa-solid fa-chevron-down text-gray-400';
        lsSet(LK_DEDUP_COLLAPSED, now);
    });

    // AI折叠
    const aiCollapsed = lsGet(LK_AI_COLLAPSED, true);
    aiSettingsContent.className = aiCollapsed ? 'collapsed-content' : 'expanded-content';
    aiSettingsIcon.className = aiCollapsed ? 'fa-solid fa-chevron-right text-gray-500' : 'fa-solid fa-chevron-down text-gray-500';
    aiSettingsToggle.addEventListener('click', () => {
        const now = aiSettingsContent.classList.contains('expanded-content');
        aiSettingsContent.className = now ? 'collapsed-content' : 'expanded-content';
        aiSettingsIcon.className = now ? 'fa-solid fa-chevron-right text-gray-500' : 'fa-solid fa-chevron-down text-gray-500';
        lsSet(LK_AI_COLLAPSED, now);
    });

    // 事件绑定
    fileInput.addEventListener('change', e => {
        if (e.target.files[0]) {
            handleFile(e.target.files[0], sheetSelect, loadSheetCallback);
        }
    });
    loadSheetBtn.addEventListener('click', () => {
        if (getWorkbook()) {
            setCurrentSheetName(sheetSelect.value);
            loadSheetCallback();
        }
    });
    runProcessBtn.addEventListener('click', runProcess);
    exportBtn.addEventListener('click', exportData);
    saveConfigBtn.addEventListener('click', handleSaveConfig);
    exportConfigBtn.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(loadConfigs(), null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'variant_configs.json';
        a.click();
    });
    importConfigFile.addEventListener('change', e => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = ev => {
            try { saveConfigs(JSON.parse(ev.target.result)); log('导入成功', 'success'); } catch { log('无效JSON', 'error'); }
            importConfigFile.value = '';
            renderConfigList(configListContainer, loadConfigs, applyConfigWrapper, log);
        };
        r.readAsText(f);
    });
    resetMappingBtn.addEventListener('click', () => mappingEditor.setValue(DEFAULT_MAPPING));
    resetCodeBtn.addEventListener('click', () => codeEditor.setValue(DEFAULT_CODE));
    resetColorEnumBtn.addEventListener('click', () => {
        colorEnumEditor.setValue(JSON.stringify(DEFAULT_COLOR_ENUM, null, 2));
        saveColorEnumFromEditor();
        updateColorUnmappedMiniWrapper();
    });
    document.body.addEventListener('dragover', e => e.preventDefault());
    document.body.addEventListener('drop', e => {
        e.preventDefault();
        if (e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0], sheetSelect, loadSheetCallback);
        }
    });
    mappingFullscreenBtn.addEventListener('click', e => { e.stopPropagation(); toggleFullscreen(mappingCard, mappingEditor, mappingFullscreenBtn); });
    colorEnumFullscreenBtn.addEventListener('click', e => { e.stopPropagation(); toggleFullscreen(colorEnumCard, colorEnumEditor, colorEnumFullscreenBtn); });
    codeFullscreenBtn.addEventListener('click', e => { e.stopPropagation(); toggleFullscreen(codeCard, codeEditor, codeFullscreenBtn); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (mappingCard.classList.contains('fullscreen-card')) toggleFullscreen(mappingCard, mappingEditor, mappingFullscreenBtn);
            if (colorEnumCard.classList.contains('fullscreen-card')) toggleFullscreen(colorEnumCard, colorEnumEditor, colorEnumFullscreenBtn);
            if (codeCard.classList.contains('fullscreen-card')) toggleFullscreen(codeCard, codeEditor, codeFullscreenBtn);
        }
    });
    skuColSelect.addEventListener('change', () => {
        if (!dedupSkuField.value.trim() && skuColSelect.value) { dedupSkuField.value = skuColSelect.value; saveDedupFields(); }
        updateDedupDatalist();
    });
    parentColSelect.addEventListener('change', () => updateDedupDatalist());

    dedupRunBtn.addEventListener('click', runColorDedup);
    dedupResetFieldsBtn.addEventListener('click', resetDedupFieldsToDefault);
    [dedupColorTypeField, dedupGroupField, dedupColorField, dedupSkuField, dedupNewColField].forEach(el => {
        el.addEventListener('input', () => { saveDedupFields(); updateDedupFieldHints(); updateDedupReadyStatus(); });
        el.addEventListener('focus', () => updateDedupDatalist());
    });

    aiClassifyBtn.addEventListener('click', handleAIClassify);
    aiApiKey.addEventListener('input', saveAISettings);
    aiModel.addEventListener('change', saveAISettings);
    aiPrompt.addEventListener('input', saveAISettings);

    // 恢复上次去重列名
    lastDedupColName = lsGet('last_dedup_col_name', '');

    // 初始渲染
    renderConfigList(configListContainer, loadConfigs, applyConfigWrapper, log);

    updateDedupDatalist();
    updateDedupFieldHints();
    updateDedupReadyStatus();
    log('🚀 系统就绪，上传Excel后依次执行“处理”与“颜色去重”，最后导出（去重列将包含在内）');
}

// 启动
init();
