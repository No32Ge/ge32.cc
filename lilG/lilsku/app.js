
// 应用入口，负责依赖注入与初始化编排

import { store } from './core/dataState.js';
import { ConfigManager } from './core/configManager.js';
import { parseWorkbook, getSheetNames, sheetToJson, exportToExcel } from './services/excelService.js';
import { buildColorMap, normalizeColor, findUnmappedColors } from './services/colorStandardizer.js';
import { processVariants } from './services/variantProcessor.js';
import { runDedup } from './services/colorDeduplicator.js';
import { callAI } from './services/aiService.js';
import { initEditors, getMappingEditor, getColorEnumEditor, getCodeEditor, refreshEditors } from './ui/codeEditors.js';
import { initCollapse, toggleFullscreen } from './ui/panelManager.js';
import { createLogger } from './ui/logDisplay.js';
import { showToast } from './ui/toast.js';
import { initConfigPanel } from './ui/configPanel.js';
import { initDedupPanel } from './ui/dedupPanel.js';

// 默认配置值
const DEFAULT_MAPPING = JSON.stringify({
    weight: '重量(g)',
    length: '长',
    width: '宽',
    height: '高',
    material: '面料成分',
    color: '亚马逊美国站颜色'
}, null, 2);

const DEFAULT_CODE = [
    '// ═══════════════════════════════════════════════════════════════',
    '// 变体组生成器 · 处理函数说明书（自动列识别 + 材质提取 + 颜色标准化）',
    '// ═══════════════════════════════════════════════════════════════',
    '// ',
    '// 📥 可用参数：',
    '//    rows        - 原始数据数组',
    '//    columns     - 列映射对象（如 { weight:"重量(g)", color:"颜色" }）',
    '//    skuCol      - SKU 列名',
    '//    parentCol   - 父SKU 列名',
    '//',
    '// 📤 返回值：对象数组，每个对象代表一行。',
    '//    新增字段会被自动识别并包含在"导出生成列"中。',
    '// ═══════════════════════════════════════════════════════════════',
    'return (function(rows, columns, skuCol, parentCol) {',
    '    ',
    '    // ─────────────────── 0. 工具函数 ───────────────────',
    '    const toNum = v => isNaN(parseFloat(v)) ? NaN : parseFloat(v);',
    '    ',
    '    function extractFirstMaterial(raw) {',
    '        if (!raw || typeof raw !== "string") return "";',
    '        let trimmed = raw.trim();',
    '        if (trimmed === "") return "";',
    '        let splitBySeparators = (text) => {',
    '            let normalized = text.replace(/，/g, ",").replace(/﹢/g, "+").replace(/＆/g, "&");',
    '            let parts = normalized.split(/\\s*[,+&\\/|]\\s*|\\s+and\\s+|\\s*\\+\\s*/);',
    '            let filtered = parts.filter(p => p.trim().length > 0);',
    '            return filtered.length ? filtered : [text];',
    '        };',
    '        let segments = splitBySeparators(trimmed);',
    '        let firstSegment = segments[0] ? segments[0].trim() : trimmed;',
    '        let cleaned = firstSegment.replace(/\\d+(?:\\.\\d+)?%/g, "");',
    '        const materialWordRegex = /[A-Za-z\\u00C0-\\u024F\\u0400-\\u04FF]+(?:[\\s-][A-Za-z\\u00C0-\\u024F\\u0400-\\u04FF]+)*/;',
    '        let match = cleaned.match(materialWordRegex);',
    '        if (match && match[0]) {',
    '            cleaned = match[0].trim();',
    '        } else {',
    '            let onlyAlpha = cleaned.replace(/[^\\p{L}\\s-]/gu, "").trim();',
    '            cleaned = onlyAlpha || firstSegment.replace(/[\\d%]/g, "").replace(/[^\\w\\s\\u4e00-\\u9fa5-]/g, "").trim() || firstSegment.replace(/[^\\p{L}]/gu, "").trim() || firstSegment;',
    '        }',
    '        cleaned = cleaned.replace(/\\s+/g, " ").trim();',
    '        return cleaned || "未识别";',
    '    }',
    '    ',
    '    // ─────────── 颜色标准化 ───────────',
    '    let colorExactMap = new Map();',
    '    const colorFuzzyRules = [',
    '        { regex: /^[a-z]$/i, target: "Multicolor" },',
    '        { regex: /^multiple[a-z]*$/i, target: "Multicolor" },',
    '        { regex: /^multicolour[a-z]*$/i, target: "Multicolor" },',
    '        { regex: /^multicolor[a-z]*$/i, target: "Multicolor" },',
    '        { regex: /^mixed\\s*colou?r[a-z]*$/i, target: "Multicolor" },',
    '        { regex: /^mixedcolou?r[a-z]*$/i, target: "Multicolor" },',
    '        { regex: /^mixed\\s+colou?rs?[a-z]*$/i, target: "Multicolor" },',
    '        { regex: /^mixed[\\s\\-_]?colou?r[a-z]*$/i, target: "Multicolor" },',
    '        { regex: /^mixed\\s+colors?[a-z]*$/i, target: "Multicolor" }',
    '    ];',
    '    try {',
    '        const colorEnumConfig = JSON.parse(localStorage.getItem("color_enum_config_fusion") || "{}");',
    '        for (const [category, aliases] of Object.entries(colorEnumConfig)) {',
    '            if (Array.isArray(aliases)) {',
    '                aliases.forEach(alias => {',
    '                    const key = String(alias).trim().toLowerCase();',
    '                    if (key) colorExactMap.set(key, category);',
    '                });',
    '            }',
    '        }',
    '    } catch(e) { /* 颜色配置读取失败，使用空映射 */ }',
    '    ',
    '    function normalizeColor(raw) {',
    '        if (!raw || typeof raw !== "string") return "";',
    '        const trimmed = raw.trim();',
    '        if (trimmed === "") return "";',
    '        const norm = trimmed.toLowerCase();',
    '        const mapped = colorExactMap.get(norm);',
    '        if (mapped) return mapped;',
    '        for (const rule of colorFuzzyRules) {',
    '            if (rule.regex.test(norm)) return rule.target;',
    '        }',
    '        return trimmed;',
    '    }',
    '    // ─────────── 颜色标准化结束 ───────────',
    '    ',
    '    // ─────────────────── 1. 常量定义 ───────────────────',
    '    const GRAM_TO_LB = 0.00220462;',
    '    const CM_TO_INCH = 0.393701;',
    '    ',
    '    // ─────────────────── 2. 数据分组 ───────────────────',
    '    const parentMap = new Map();',
    '    const groupInfo = new Map();',
    '    const tempRows = [];',
    '    ',
    '    for (let i = 0; i < rows.length; i++) {',
    '        const r = rows[i];',
    '        const sku = String(r[skuCol] || "").trim();',
    '        const parent = String(r[parentCol] || "").trim();',
    '        ',
    '        let groupId = parent ? (parentMap.has(parent) ? parentMap.get(parent) : sku) : sku;',
    '        if (parent && !parentMap.has(parent)) parentMap.set(parent, groupId);',
    '        ',
    '        const weightVal = r[columns.weight] !== undefined ? r[columns.weight] : "";',
    '        const net = toNum(weightVal) ? (toNum(weightVal) * GRAM_TO_LB).toFixed(2) : "";',
    '        const lengthVal = r[columns.length] !== undefined ? r[columns.length] : "";',
    '        const l = toNum(lengthVal) ? (toNum(lengthVal) * CM_TO_INCH).toFixed(2) : "";',
    '        const widthVal = r[columns.width] !== undefined ? r[columns.width] : "";',
    '        const w = toNum(widthVal) ? (toNum(widthVal) * CM_TO_INCH).toFixed(2) : "";',
    '        const heightVal = r[columns.height] !== undefined ? r[columns.height] : "";',
    '        const h = toNum(heightVal) ? (toNum(heightVal) * CM_TO_INCH).toFixed(2) : "";',
    '        ',
    '        let materialClass = "";',
    '        if (columns.material) {',
    '            const materialRaw = String(r[columns.material] || "").trim();',
    '            materialClass = materialRaw ? extractFirstMaterial(materialRaw) : "";',
    '        }',
    '        ',
    '        let colorClass = "";',
    '        if (columns.color) {',
    '            const colorRaw = String(r[columns.color] || "").trim();',
    '            colorClass = colorRaw ? normalizeColor(colorRaw) : "";',
    '        }',
    '        ',
    '        tempRows.push({',
    '            ...r,',
    '            _groupId: groupId,',
    '            _net: net,',
    '            _l: l,',
    '            _w: w,',
    '            _h: h,',
    '            _materialClass: materialClass,',
    '            _colorClass: colorClass',
    '        });',
    '        ',
    '        if (!groupInfo.has(groupId)) groupInfo.set(groupId, { indices: [] });',
    '        groupInfo.get(groupId).indices.push(i);',
    '    }',
    '    ',
    '    // ─────────────────── 3. 确定主变体 ───────────────────',
    '    for (let [gid, info] of groupInfo) {',
    '        const idxs = info.indices;',
    '        if (idxs.length === 1) {',
    '            info.primaryIdx = 0;',
    '        } else {',
    '            info.primaryIdx = 1 + Math.floor(Math.random() * (idxs.length - 1));',
    '        }',
    '    }',
    '    ',
    '    // ─────────────────── 4. 构建最终结果（包含所有生成列）───────────────────',
    '    return tempRows.map((t, i) => {',
    '        const info = groupInfo.get(t._groupId);',
    '        const pos = info.indices.indexOf(i);',
    '        return {',
    '            ...t,',
    '            "Variant Group ID": t._groupId,',
    '            "Is Primary Variant": (pos === info.primaryIdx) ? "Yes" : "No",',
    '            netContentStatement: t._net,',
    '            assembledProductLength: t._l,',
    '            assembledProductWidth: t._w,',
    '            assembledProductHeight: t._h,',
    '            "Material Classification": t._materialClass,',
    '            "Color Classification": t._colorClass',
    '        };',
    '    });',
    '})(rows, columns, skuCol, parentCol);',
    '// ═══════════════════════════════════════════════════════════════'
].join('\n');

document.addEventListener('DOMContentLoaded', () => {
    // 缓存 DOM 元素
    const $ = id => document.getElementById(id);
    const els = {
        fileInput: $('fileInput'),
        sheetSelect: $('sheetSelect'),
        loadSheetBtn: $('loadSheetBtn'),
        skuColSelect: $('skuColSelect'),
        parentColSelect: $('parentColSelect'),
        mappingToggleHeader: $('mappingToggleHeader'),
        mappingToggleIcon: $('mappingToggleIcon'),
        mappingCollapseWrapper: $('mappingCollapseWrapper'),
        mappingFullscreenBtn: $('mappingFullscreenBtn'),
        resetMappingBtn: $('resetMappingBtn'),
        mappingContainer: $('mappingEditorContainer'),
        colorEnumToggleHeader: $('colorEnumToggleHeader'),
        colorEnumToggleIcon: $('colorEnumToggleIcon'),
        colorEnumCollapseWrapper: $('colorEnumCollapseWrapper'),
        colorEnumFullscreenBtn: $('colorEnumFullscreenBtn'),
        resetColorEnumBtn: $('resetColorEnumBtn'),
        colorEnumContainer: $('colorEnumEditorContainer'),
        colorUnmappedMini: $('colorUnmappedMini'),
        aiSettingsToggle: $('aiSettingsToggle'),
        aiSettingsIcon: $('aiSettingsIcon'),
        aiSettingsContent: $('aiSettingsContent'),
        aiApiKey: $('aiApiKey'),
        aiModel: $('aiModel'),
        aiPrompt: $('aiPrompt'),
        aiClassifyBtn: $('aiClassifyBtn'),
        codeToggleHeader: $('codeToggleHeader'),
        codeToggleIcon: $('codeToggleIcon'),
        codeCollapseWrapper: $('codeCollapseWrapper'),
        codeFullscreenBtn: $('codeFullscreenBtn'),
        resetCodeBtn: $('resetCodeBtn'),
        codeContainer: $('codeEditorContainer'),
        dedupToggleHeader: $('dedupToggleHeader'),
        dedupToggleIcon: $('dedupToggleIcon'),
        dedupCollapseWrapper: $('dedupCollapseWrapper'),
        dedupColorTypeField: $('dedupColorTypeField'),
        dedupGroupField: $('dedupGroupField'),
        dedupColorField: $('dedupColorField'),
        dedupSkuField: $('dedupSkuField'),
        dedupNewColField: $('dedupNewColField'),
        dedupColumnsList: $('dedupColumnsList'),
        dedupRunBtn: $('dedupRunBtn'),
        dedupStatsArea: $('dedupStatsArea'),
        dedupResetFieldsBtn: $('dedupResetFieldsBtn'),
        dedupReadyBadge: $('dedupReadyBadge'),
        dedupReadyDot: $('dedupReadyDot'),
        dedupReadyText: $('dedupReadyText'),
        dedupColorTypeHint: $('dedupColorTypeHint'),
        dedupGroupHint: $('dedupGroupHint'),
        dedupColorHint: $('dedupColorHint'),
        dedupSkuHint: $('dedupSkuHint'),
        dedupNewColHint: $('dedupNewColHint'),
        dedupIntegrationNote: $('dedupIntegrationNote'),
        runProcessBtn: $('runProcessBtn'),
        exportBtn: $('exportResultBtn'),
        exportFullCheck: $('exportFullCheckbox'),
        exportNewCheck: $('exportNewColsCheckbox'),
        dataStatus: $('dataStatus'),
        logArea: $('logArea'),
        saveConfigBtn: $('saveConfigBtn'),
        exportConfigBtn: $('exportConfigBtn'),
        importConfigFile: $('importConfigFile'),
        configListContainer: $('configListContainer'),
        aiModalContainer: $('aiModalContainer'),
        mappingCard: $('mappingCard'),
        colorEnumCard: $('colorEnumCard'),
        codeCard: $('codeCard')
    };

    // 初始化日志
    const log = createLogger(els.logArea);

    // 初始化编辑器
    const initialColorEnum = ConfigManager.getColorEnum();
    const editors = initEditors(
        els.mappingContainer,
        els.colorEnumContainer,
        els.codeContainer,
        {
            mapping: DEFAULT_MAPPING,
            colorEnum: JSON.stringify(initialColorEnum, null, 2),
            code: DEFAULT_CODE
        }
    );
    const { mappingEditor, colorEnumEditor, codeEditor } = editors;

    // 颜色标准化引擎初始化
    buildColorMap(initialColorEnum);
    // 颜色枚举编辑器变化时更新引擎与未映射提示
    colorEnumEditor.on('change', () => {
        try {
            const parsed = JSON.parse(colorEnumEditor.getValue());
            ConfigManager.saveColorEnum(parsed);
            buildColorMap(parsed);
            updateUnmappedMini();
        } catch { /* 忽略解析错误 */ }
    });

    // 未映射颜色提示
    function getColorColumnName() {
        try {
            const m = JSON.parse(mappingEditor.getValue());
            return m.color || null;
        } catch { return null; }
    }
    function scanColorValues() {
        if (!store.rawDataRows.length) return [];
        const col = getColorColumnName();
        if (!col || !store.allColumns.includes(col)) return [];
        const unique = new Set();
        store.rawDataRows.forEach(r => {
            const v = String(r[col] || '').trim();
            if (v) unique.add(v);
        });
        return Array.from(unique);
    }
    function updateUnmappedMini() {
        const allColors = scanColorValues();
        if (!allColors.length) {
            els.colorUnmappedMini.classList.add('hidden');
            return;
        }
        const unmapped = findUnmappedColors(allColors);
        if (!unmapped.length) {
            els.colorUnmappedMini.classList.add('hidden');
            return;
        }
        els.colorUnmappedMini.classList.remove('hidden');
        const esc = s => String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
        const tags = unmapped.slice(0, 15).map(u => `<span class="unmapped-tag">${esc(u.display)}</span>`).join('');
        const more = unmapped.length > 15 ? ` ...及另外${unmapped.length - 15}项` : '';
        els.colorUnmappedMini.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-yellow-400"></i> 未映射: ${tags}${more}`;
    }

    // 初始化面板折叠
    initCollapse(els.mappingToggleHeader, els.mappingToggleIcon, els.mappingCollapseWrapper,
        'expanded-content-mapping', ConfigManager.getCollapsedState('mapping'), () => {
            setTimeout(() => mappingEditor.refresh(), 350);
        });
    initCollapse(els.colorEnumToggleHeader, els.colorEnumToggleIcon, els.colorEnumCollapseWrapper,
        'expanded-content-color-enum', ConfigManager.getCollapsedState('colorEnum'), () => {
            setTimeout(() => colorEnumEditor.refresh(), 350);
        });
    initCollapse(els.codeToggleHeader, els.codeToggleIcon, els.codeCollapseWrapper,
        'expanded-content', ConfigManager.getCollapsedState('code'), () => {
            setTimeout(() => codeEditor.refresh(), 350);
        });
    // AI 设置折叠
    const aiCollapsed = ConfigManager.getCollapsedState('ai');
    els.aiSettingsContent.className = aiCollapsed ? 'collapsed-content' : 'expanded-content';
    els.aiSettingsIcon.className = aiCollapsed ? 'fa-solid fa-chevron-right text-gray-500' : 'fa-solid fa-chevron-down text-gray-500';
    els.aiSettingsToggle.addEventListener('click', () => {
        const now = els.aiSettingsContent.classList.contains('expanded-content');
        els.aiSettingsContent.className = now ? 'collapsed-content' : 'expanded-content';
        els.aiSettingsIcon.className = now ? 'fa-solid fa-chevron-right text-gray-500' : 'fa-solid fa-chevron-down text-gray-500';
        ConfigManager.saveCollapsedState('ai', now);
    });
    // 去重面板折叠
    const dedupCollapsed = ConfigManager.getCollapsedState('dedup');
    els.dedupCollapseWrapper.className = dedupCollapsed ? 'collapsed-content' : 'expanded-content-dedup';
    els.dedupToggleIcon.className = dedupCollapsed ? 'fa-solid fa-chevron-right text-gray-400' : 'fa-solid fa-chevron-down text-gray-400';
    els.dedupToggleHeader.addEventListener('click', () => {
        const now = els.dedupCollapseWrapper.classList.contains('expanded-content-dedup');
        els.dedupCollapseWrapper.className = now ? 'collapsed-content' : 'expanded-content-dedup';
        els.dedupToggleIcon.className = now ? 'fa-solid fa-chevron-right text-gray-400' : 'fa-solid fa-chevron-down text-gray-400';
        ConfigManager.saveCollapsedState('dedup', now);
    });

    // 全屏切换
    els.mappingFullscreenBtn.addEventListener('click', e => {
        e.stopPropagation();
        toggleFullscreen(els.mappingCard, mappingEditor, els.mappingFullscreenBtn);
    });
    els.colorEnumFullscreenBtn.addEventListener('click', e => {
        e.stopPropagation();
        toggleFullscreen(els.colorEnumCard, colorEnumEditor, els.colorEnumFullscreenBtn);
    });
    els.codeFullscreenBtn.addEventListener('click', e => {
        e.stopPropagation();
        toggleFullscreen(els.codeCard, codeEditor, els.codeFullscreenBtn);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (els.mappingCard.classList.contains('fullscreen-card')) toggleFullscreen(els.mappingCard, mappingEditor, els.mappingFullscreenBtn);
            if (els.colorEnumCard.classList.contains('fullscreen-card')) toggleFullscreen(els.colorEnumCard, colorEnumEditor, els.colorEnumFullscreenBtn);
            if (els.codeCard.classList.contains('fullscreen-card')) toggleFullscreen(els.codeCard, codeEditor, els.codeFullscreenBtn);
        }
    });

    // 文件处理
    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const wb = parseWorkbook(e.target.result);
                store.workbook = wb;
                els.sheetSelect.innerHTML = getSheetNames(wb).map(n => `<option>${n}</option>`).join('');
                els.sheetSelect.disabled = false;
                store.currentSheetName = wb.SheetNames[0];
                els.sheetSelect.value = store.currentSheetName;
                loadCurrentSheet();
                log(`📁 文件 "${file.name}" 已加载`, 'info');
            } catch (err) {
                log('文件解析失败', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    }
    els.fileInput.addEventListener('change', e => e.target.files[0] && handleFile(e.target.files[0]));
    els.loadSheetBtn.addEventListener('click', () => {
        if (store.workbook) {
            store.currentSheetName = els.sheetSelect.value;
            loadCurrentSheet();
        }
    });
    document.body.addEventListener('dragover', e => e.preventDefault());
    document.body.addEventListener('drop', e => {
        e.preventDefault();
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    function loadCurrentSheet() {
        if (!store.workbook || !store.currentSheetName) return;
        try {
            const { rows, columns } = sheetToJson(store.workbook, store.currentSheetName);
            if (!rows.length) { log('工作表为空', 'error'); return; }
            store.setRawData(store.workbook, store.currentSheetName, rows, columns);
            updateColumnSelects(columns);
            log(`📊 已加载 "${store.currentSheetName}"，${rows.length}行`, 'info');
            els.dataStatus.textContent = `✅ 已加载 ${rows.length} 行`;
            // 重置处理状态
            els.dedupStatsArea.innerHTML = '';
            els.dedupIntegrationNote.style.display = 'none';
        } catch (err) {
            log('加载工作表失败', 'error');
        }
    }

    function updateColumnSelects(columns) {
        const opts = columns.map(c => `<option value="${c}">${c}</option>`).join('');
        els.skuColSelect.innerHTML = els.parentColSelect.innerHTML = `<option value="">-- 选择列 --</option>${opts}`;
        els.skuColSelect.disabled = els.parentColSelect.disabled = false;
        // 自动猜测 SKU 和父 SKU 列
        const find = keys => columns.find(c => keys.some(k => c.toLowerCase().includes(k)));
        const sku = find(['sku', '商品编码', '子sku']) || '';
        const parent = find(['父', 'parent', '父sku']) || '';
        els.skuColSelect.value = sku;
        els.parentColSelect.value = parent;
        // 同步去重 SKU 字段
        if (!els.dedupSkuField.value.trim() && sku) {
            els.dedupSkuField.value = sku;
            // 触发保存
        }
    }

    // SKU 选择变化时同步去重字段
    els.skuColSelect.addEventListener('change', () => {
        if (!els.dedupSkuField.value.trim() && els.skuColSelect.value) {
            els.dedupSkuField.value = els.skuColSelect.value;
            ConfigManager.saveDedupFields({
                colorType: els.dedupColorTypeField.value,
                variantGroup: els.dedupGroupField.value,
                amazonColor: els.dedupColorField.value,
                sku: els.dedupSkuField.value,
                newColName: els.dedupNewColField.value
            });
        }
        // 更新 datalist
        updateDedupDatalist();
    });
    els.parentColSelect.addEventListener('change', () => updateDedupDatalist());

    function updateDedupDatalist() {
        const allCols = store.getAllAvailableColumns();
        els.dedupColumnsList.innerHTML = allCols.map(c => `<option value="${c}">`).join('');
    }

    // 处理执行
    els.runProcessBtn.addEventListener('click', () => {
        if (!store.rawDataRows.length) { log('请先加载数据', 'error'); return; }
        const skuCol = els.skuColSelect.value;
        const parentCol = els.parentColSelect.value;
        if (!skuCol || !parentCol) { log('请选择SKU和父SKU列', 'error'); return; }
        let columns;
        try {
            columns = JSON.parse(mappingEditor.getValue());
        } catch {
            log('映射JSON格式错误', 'error');
            return;
        }
        try {
            const result = processVariants(store.rawDataRows, columns, skuCol, parentCol, codeEditor.getValue(), normalizeColor);
            store.setProcessedData(result);
            const newCols = Object.keys(result[0]).filter(c => !store.allColumns.includes(c) && !c.startsWith('_'));
            log(`✅ 处理完成，${result.length}行，新增${newCols.length}列: ${newCols.join(', ')}`, 'success');
            els.dataStatus.textContent = `✅ 已处理 ${result.length} 行`;
            updateUnmappedMini();
            updateDedupDatalist();
            // 清空去重统计
            els.dedupStatsArea.innerHTML = '';
            els.dedupIntegrationNote.style.display = 'none';
        } catch (e) {
            log(`❌ 处理错误: ${e.message}`, 'error');
        }
    });

    // 导出结果
    els.exportBtn.addEventListener('click', () => {
        if (!store.processedData.length) { log('无数据可导出', 'error'); return; }
        const allCols = Object.keys(store.processedData[0]);
        const newCols = allCols.filter(c => !store.allColumns.includes(c) && !c.startsWith('_'));
        const skuCol = els.skuColSelect.value;
        let exportCols = [];
        if (els.exportFullCheck.checked) {
            exportCols = allCols.filter(c => !c.startsWith('_'));
        } else if (els.exportNewCheck.checked) {
            exportCols = [skuCol, ...newCols.filter(c => c !== skuCol)];
        } else {
            exportCols = [skuCol];
        }
        exportCols = exportCols.filter(c => allCols.includes(c));
        try {
            exportToExcel(store.processedData, exportCols);
            log(`📎 导出成功（${exportCols.length}列）`, 'success');
        } catch (e) {
            log('导出失败', 'error');
        }
    });

    // 编辑器重置按钮
    els.resetMappingBtn.addEventListener('click', () => mappingEditor.setValue(DEFAULT_MAPPING));
    els.resetCodeBtn.addEventListener('click', () => codeEditor.setValue(DEFAULT_CODE));
    els.resetColorEnumBtn.addEventListener('click', () => {
        const defaultEnum = ConfigManager.getDefaults().COLOR_ENUM;
        colorEnumEditor.setValue(JSON.stringify(defaultEnum, null, 2));
        // 触发 change 事件会自动更新引擎
    });

    // AI 功能
    loadAISettings();
    els.aiApiKey.addEventListener('input', saveAISettings);
    els.aiModel.addEventListener('change', saveAISettings);
    els.aiPrompt.addEventListener('input', saveAISettings);
    function loadAISettings() {
        const settings = ConfigManager.getAISettings();
        els.aiApiKey.value = settings.apiKey;
        els.aiModel.value = settings.model;
        els.aiPrompt.value = settings.prompt;
    }
    function saveAISettings() {
        ConfigManager.saveAISettings({
            apiKey: els.aiApiKey.value,
            model: els.aiModel.value,
            prompt: els.aiPrompt.value
        });
    }

    els.aiClassifyBtn.addEventListener('click', async () => {
        const unmapped = findUnmappedColors(scanColorValues()).map(u => u.display);
        if (!unmapped.length) {
            alert('没有未映射颜色');
            return;
        }
        els.aiClassifyBtn.disabled = true;
        try {
            const settings = ConfigManager.getAISettings();
            const suggestions = await callAI(unmapped, settings.apiKey, settings.model, settings.prompt);
            if (suggestions && suggestions.length) showAISuggestions(suggestions);
        } catch (e) {
            alert('AI分类失败: ' + e.message);
        } finally {
            els.aiClassifyBtn.disabled = false;
        }
    });

    function showAISuggestions(suggestions) {
        els.aiModalContainer.innerHTML = '';
        const overlay = document.createElement('div');
        overlay.className = 'ai-modal-overlay';
        const esc = s => String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
        overlay.innerHTML = `
            <div class="ai-modal">
                <h3 class="text-xl font-bold mb-3"><i class="fa-solid fa-robot text-purple-400"></i> AI建议</h3>
                <div class="max-h-60 overflow-y-auto mb-4">${suggestions.map(s => `<div class="ai-suggestion-item"><span>${esc(s.value)} → <b class="text-green-400">${esc(s.key)}</b></span></div>`).join('')}</div>
                <div class="flex justify-end gap-3"><button class="btn-glass" id="aiCancelBtn">取消</button><button class="btn-glass btn-primary" id="aiApplyBtn"><i class="fa-solid fa-check"></i> 应用</button></div>
            </div>`;
        els.aiModalContainer.appendChild(overlay);
        const close = () => els.aiModalContainer.innerHTML = '';
        document.getElementById('aiCancelBtn').addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        document.getElementById('aiApplyBtn').addEventListener('click', () => {
            try {
                let cfg = JSON.parse(colorEnumEditor.getValue());
                suggestions.forEach(({ key, value }) => {
                    if (!key || !value) return;
                    if (!cfg[key]) cfg[key] = [];
                    if (!cfg[key].includes(value)) cfg[key].push(value);
                });
                colorEnumEditor.setValue(JSON.stringify(cfg, null, 2));
                // change 事件会自动触发
                close();
                log('✅ AI建议已应用', 'success');
            } catch (e) { alert('合并失败'); }
        });
    }

    // 初始化去重面板
    const dedup = initDedupPanel({
        dedupColorTypeField: els.dedupColorTypeField,
        dedupGroupField: els.dedupGroupField,
        dedupColorField: els.dedupColorField,
        dedupSkuField: els.dedupSkuField,
        dedupNewColField: els.dedupNewColField,
        dedupColumnsList: els.dedupColumnsList,
        dedupRunBtn: els.dedupRunBtn,
        dedupStatsArea: els.dedupStatsArea,
        dedupResetFieldsBtn: els.dedupResetFieldsBtn,
        dedupReadyDot: els.dedupReadyDot,
        dedupReadyText: els.dedupReadyText,
        dedupColorTypeHint: els.dedupColorTypeHint,
        dedupGroupHint: els.dedupGroupHint,
        dedupColorHint: els.dedupColorHint,
        dedupSkuHint: els.dedupSkuHint,
        dedupNewColHint: els.dedupNewColHint,
        dedupIntegrationNote: els.dedupIntegrationNote,
        logFn: log
    });

    // 方案管理
    function getCurrentConfig() {
        return {
            name: store.currentConfigName,
            skuColumn: els.skuColSelect.value,
            parentSkuColumn: els.parentColSelect.value,
            mapping: mappingEditor.getValue(),
            code: codeEditor.getValue(),
            colorEnum: colorEnumEditor.getValue(),
            dedupFields: {
                colorType: els.dedupColorTypeField.value.trim(),
                variantGroup: els.dedupGroupField.value.trim(),
                amazonColor: els.dedupColorField.value.trim(),
                sku: els.dedupSkuField.value.trim(),
                newColName: els.dedupNewColField.value.trim()
            }
        };
    }
    function applyConfig(cfg) {
        if (cfg.skuColumn && store.allColumns.includes(cfg.skuColumn)) els.skuColSelect.value = cfg.skuColumn;
        if (cfg.parentSkuColumn && store.allColumns.includes(cfg.parentSkuColumn)) els.parentColSelect.value = cfg.parentSkuColumn;
        if (cfg.mapping) mappingEditor.setValue(cfg.mapping);
        if (cfg.code) codeEditor.setValue(cfg.code);
        if (cfg.colorEnum) {
            colorEnumEditor.setValue(cfg.colorEnum);
            // change 事件会触发
        }
        if (cfg.dedupFields) {
            els.dedupColorTypeField.value = cfg.dedupFields.colorType || '';
            els.dedupGroupField.value = cfg.dedupFields.variantGroup || '';
            els.dedupColorField.value = cfg.dedupFields.amazonColor || '';
            els.dedupSkuField.value = cfg.dedupFields.sku || '';
            els.dedupNewColField.value = cfg.dedupFields.newColName || '去重后颜色';
            ConfigManager.saveDedupFields({
                colorType: cfg.dedupFields.colorType,
                variantGroup: cfg.dedupFields.variantGroup,
                amazonColor: cfg.dedupFields.amazonColor,
                sku: cfg.dedupFields.sku,
                newColName: cfg.dedupFields.newColName
            });
            dedup.updateHints?.();
            dedup.updateReadyStatus?.();
        }
        store.currentConfigName = cfg.name || '未命名';
        updateDedupDatalist();
    }
    const configPanel = initConfigPanel({
        configListContainer: els.configListContainer,
        saveConfigBtn: els.saveConfigBtn,
        exportConfigBtn: els.exportConfigBtn,
        importConfigFile: els.importConfigFile,
        getCurrentConfigFn: getCurrentConfig,
        onApplyConfigFn: applyConfig,
        logFn: log
    });

    // 初始化星星背景（保留）
    createStars();

    function createStars() {
        const container = document.getElementById('stars');
        if (!container) return;
        const colors = ['#60a5fa', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#f87171', '#38bdf8', '#fb923c'];
        for (let i = 0; i < 150; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            const size = Math.random() * 2.5 + 1;
            star.style.width = star.style.height = size + 'px';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.setProperty('--duration', Math.random() * 3 + 2 + 's');
            star.style.setProperty('--delay', Math.random() * 5 + 's');
            star.style.background = colors[Math.floor(Math.random() * colors.length)];
            container.appendChild(star);
        }
    }

    // 恢复上次去重列名
    store.setLastDedupColName(ConfigManager.getLastDedupColName());

    // 初始刷新
    updateDedupDatalist();
    log('🚀 系统就绪，上传Excel后依次执行“处理”与“颜色去重”，最后导出（去重列将包含在内）');
});
