
(function() {
    let workbook = null,
        currentSheetName = '',
        rawDataRows = [],
        allColumns = [];
    let processedData = [];
    let codeEditor = null,
        mappingEditor = null,
        colorEnumEditor = null;

    const $ = id => document.getElementById(id);
    const fileInput = $('fileInput'),
        sheetSelect = $('sheetSelect'),
        loadSheetBtn = $('loadSheetBtn');
    const skuColSelect = $('skuColSelect'),
        parentColSelect = $('parentColSelect');
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
    const runProcessBtn = $('runProcessBtn'),
        exportBtn = $('exportResultBtn');
    const exportFullCheck = $('exportFullCheckbox'),
        exportNewCheck = $('exportNewColsCheckbox');
    const dataStatus = $('dataStatus'),
        logArea = $('logArea');
    const saveConfigBtn = $('saveConfigBtn'),
        exportConfigBtn = $('exportConfigBtn');
    const importConfigFile = $('importConfigFile');
    const resetMappingBtn = $('resetMappingBtn'),
        resetCodeBtn = $('resetCodeBtn');
    const resetColorEnumBtn = $('resetColorEnumBtn');
    const configListContainer = $('configListContainer');
    const aiClassifyBtn = $('aiClassifyBtn');
    const aiApiKey = $('aiApiKey'),
        aiModel = $('aiModel'),
        aiPrompt = $('aiPrompt');
    const aiSettingsToggle = $('aiSettingsToggle'),
        aiSettingsIcon = $('aiSettingsIcon');
    const aiSettingsContent = $('aiSettingsContent');
    const aiModalContainer = $('aiModalContainer');
    const colorUnmappedMini = $('colorUnmappedMini');

    // 颜色去重DOM（新增列版本）
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
    const dedupReadyBadge = $('dedupReadyBadge');
    const dedupReadyDot = $('dedupReadyDot');
    const dedupReadyText = $('dedupReadyText');
    const dedupColorTypeHint = $('dedupColorTypeHint');
    const dedupGroupHint = $('dedupGroupHint');
    const dedupColorHint = $('dedupColorHint');
    const dedupSkuHint = $('dedupSkuHint');
    const dedupNewColHint = $('dedupNewColHint');
    const dedupIntegrationNote = $('dedupIntegrationNote');

    const LK_COLOR_ENUM = 'color_enum_config_fusion';
    const LK_AI_KEY = 'color_ai_api_key_fusion';
    const LK_AI_MODEL = 'color_ai_model_fusion';
    const LK_AI_PROMPT = 'color_ai_prompt_fusion';
    const LK_COLOR_COLLAPSED = 'color_enum_collapsed_fusion';
    const LK_AI_COLLAPSED = 'color_ai_collapsed_fusion';
    const LK_MAPPING_COLLAPSED = 'mapping_editor_collapsed_fusion';
    const LK_CODE_COLLAPSED = 'code_editor_collapsed_fusion';
    const LK_CONFIGS = 'variant_gen_configs_fusion_v3';
    const LK_DEDUP_COLLAPSED = 'color_dedup_collapsed_fusion';
    const LK_DEDUP_FIELDS = 'color_dedup_fields_fusion';

    const DEFAULT_COLOR_ENUM = {
        "Green": ["mint green", "army green", "light green", "dark green", "grean", "greem", "gteen",
            "green ", " green"
        ],
        "Gold": ["rose gold", "rosegold", "rose-gold"],
        "Blue": ["sky blue", "light blue", "light bule", "light b lue", "dark blue", "navy", "navy blue",
            "bleu", "bule", "bluw"
        ],
        "Brown": ["coffee", "khaki", "brown", "browm", "broun", "brawn"],
        "Red": ["watermelon red", "watermellon red", "redd", "red ", "wine", "Wine"],
        "Silver": ["sliver", "silvery", "silver,clear", "silverclear", "siver", "silvre"],
        "Gray": ["dark gray", "dark grey", "grey", "gray", "graay", "graey"],
        "Clear": ["transparent", "transparant", "transperent", "transperant", "clear", "clearr", "clera"],
        "Black": ["black", "blak", "blck", "balck"],
        "White": ["white", "whit", "wite", "whtie", "while"],
        "Yellow": ["yellow", "yello", "yelow"],
        "Orange": ["orange", "orenge", "orng"],
        "Pink": ["pink", "pinc", "peenk", "champagne", "Champagne"],
        "Purple": ["purple", "purpel", "purpple", "violet"],
        "Multicolor": ["color", "colorful", "mul", "as show", "as shown"]
    };
    const DEFAULT_AI_PROMPT =
        `你是一个颜色分类专家。请将以下颜色名称映射到标准类别。\n标准类别包括: Green, Gold, Blue, Brown, Red, Silver, Gray, Clear, Black, White, Yellow, Orange, Pink, Purple, Beige, Multicolor 等。\n规则:\n- 拼写错误应映射到正确颜色 (如 "bule" -> "Blue")\n- 包含多种颜色的名称 (如 "Blue,Red") 应归类为 "Multicolor"\n- 缩写需展开 (如 "GN" -> "Green")\n- 材质/纹理描述 (如 "wood", "camouflage") 归入合理颜色或 Multicolor\n- 无法判断的归入 "Multicolor"\n请返回JSON数组，格式: [{"key":"标准类别","value":"原始颜色名称"}, ...] 只返回JSON，不要其他内容。`;

    const DEFAULT_DEDUP_FIELDS = {
        colorType: '颜色类型',
        variantGroup: 'Variant Group ID',
        amazonColor: 'Color Classification',
        sku: '',
        newColName: '去重后颜色'
    };

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

    let currentConfig = {
        name: '默认方案',
        mapping: DEFAULT_MAPPING,
        code: DEFAULT_CODE,
        colorEnum: JSON.stringify(DEFAULT_COLOR_ENUM, null, 2),
        skuColumn: '',
        parentSkuColumn: ''
    };

    // 记录上一次去重添加的列名，用于清理
    let lastDedupColName = '';

    const esc = s => String(s || '').replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[
        m]));

    function lsGet(key, def) { try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(
            v) : def; } catch { return def; } }

    function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

    function showToastDedup(msg) {
        const toast = document.createElement('div');
        toast.className = 'toast-dedup';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2200);
    }

    function getStoredColorEnum() { return lsGet(LK_COLOR_ENUM, DEFAULT_COLOR_ENUM); }

    function saveColorEnumFromEditor() {
        if (!colorEnumEditor) return;
        try { const parsed = JSON.parse(colorEnumEditor.getValue()); if (parsed && typeof parsed ===
                'object') lsSet(LK_COLOR_ENUM, parsed); } catch {}
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
    aiApiKey.addEventListener('input', saveAISettings);
    aiModel.addEventListener('change', saveAISettings);
    aiPrompt.addEventListener('input', saveAISettings);

    function getDedupFields() {
        const saved = lsGet(LK_DEDUP_FIELDS, DEFAULT_DEDUP_FIELDS);
        if (!saved || typeof saved !== 'object') return { ...DEFAULT_DEDUP_FIELDS };
        return {
            colorType: saved.colorType || DEFAULT_DEDUP_FIELDS.colorType,
            variantGroup: saved.variantGroup || DEFAULT_DEDUP_FIELDS.variantGroup,
            amazonColor: saved.amazonColor || DEFAULT_DEDUP_FIELDS.amazonColor,
            sku: saved.sku || DEFAULT_DEDUP_FIELDS.sku,
            newColName: saved.newColName || DEFAULT_DEDUP_FIELDS.newColName
        };
    }

    function saveDedupFields() {
        lsSet(LK_DEDUP_FIELDS, {
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

    function getAllAvailableColumns() {
        const cols = new Set(allColumns);
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
            if (!val) { hint.textContent = '⚠ 未设置';
                hint.style.color = '#f59e0b'; return; }
            if (isNewCol) {
                // 新增列名，不能与已有列重名
                if (allCols.includes(val)) { hint.textContent = '⚠ 列名已存在，将被覆盖';
                    hint.style.color = '#f59e0b'; } else { hint.textContent = '✅ 将新增此列';
                    hint.style.color = '#34d399'; }
            } else {
                if (allCols.includes(val)) { hint.textContent = '✅ 列存在';
                    hint.style.color = '#34d399'; } else if (processedData.length > 0) { hint
                        .textContent = '❌ 不存在';
                    hint.style.color = '#f87171'; } else { hint.textContent = '⏳ 等待处理';
                    hint.style.color = '#64748b'; }
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
        const f1 = dedupColorTypeField.value.trim(),
            f2 = dedupGroupField.value.trim(),
            f3 = dedupColorField.value.trim(),
            f4 = dedupSkuField.value.trim();
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

    function columnLetter(index) {
        let dividend = index + 1,
            result = '';
        while (dividend > 0) {
            let modulo = (dividend - 1) % 26;
            result = String.fromCharCode(65 + modulo) + result;
            dividend = Math.floor((dividend - 1) / 26);
        }
        return result;
    }

    function runColorDedup() {
        if (!processedData.length) { log('❌ 请先执行“变体组处理”', 'error'); return; }
        const colorTypeCol = dedupColorTypeField.value.trim(),
            groupCol = dedupGroupField.value.trim(),
            colorCol = dedupColorField.value.trim(),
            skuCol = dedupSkuField.value.trim();
        const newColName = dedupNewColField.value.trim();
        if (!colorTypeCol || !groupCol || !colorCol || !skuCol || !newColName) {
            log('❌ 请填写所有字段（包括新增列名）', 'error');
            return;
        }
        const allCols = getAllAvailableColumns();
        const missing = [colorTypeCol, groupCol, colorCol, skuCol].filter(f => !allCols.includes(f));
        if (missing.length > 0) { log(`❌ 字段不存在: ${missing.join(', ')}`, 'error'); return; }

        // 清理上一次可能添加的列
        if (lastDedupColName && lastDedupColName !== newColName) {
            processedData.forEach(row => delete row[lastDedupColName]);
            log(`🧹 已移除旧去重列 "${lastDedupColName}"`, 'info');
        }

        // 深拷贝数据（其实不用，我们直接在processedData上操作）
        const resultRows = processedData;
        const idxGroup = allCols.indexOf(groupCol),
            idxColor = allCols.indexOf(colorCol),
            idxColorType = allCols.indexOf(colorTypeCol),
            idxSKU = allCols.indexOf(skuCol);

        // 分组
        const groupMap = new Map();
        resultRows.forEach((row, i) => {
            const gid = String(row[groupCol] || '').trim();
            if (!groupMap.has(gid)) groupMap.set(gid, []);
            groupMap.get(gid).push(i);
        });

        let groupsModified = 0,
            totalRowsModified = 0;
        // 先为每一行计算新值
        const newValues = new Array(resultRows.length).fill(null);
        for (const [gid, indices] of groupMap.entries()) {
            if (indices.length <= 1) {
                indices.forEach(i => newValues[i] = String(resultRows[i][colorCol] || '').trim());
                continue;
            }
            const colorVals = indices.map(i => String(resultRows[i][colorCol] || '').trim());
            if (new Set(colorVals).size === indices.length) {
                indices.forEach(i => newValues[i] = String(resultRows[i][colorCol] || '').trim());
                continue;
            }
            groupsModified++;
            const typeMap = new Map();
            indices.forEach(i => {
                const ct = String(resultRows[i][colorTypeCol] || '').trim();
                if (!typeMap.has(ct)) typeMap.set(ct, []);
                typeMap.get(ct).push(i);
            });
            for (const [ct, rowIndices] of typeMap.entries()) {
                rowIndices.sort((a, b) => String(resultRows[a][skuCol] || '').localeCompare(String(
                    resultRows[b][skuCol] || '')));
                rowIndices.forEach((rowIdx, order) => {
                    const newColor = ct ? `${ct} ${columnLetter(order)}` : columnLetter(order);
                    newValues[rowIdx] = newColor;
                    if (String(resultRows[rowIdx][colorCol] || '').trim() !== newColor)
                        totalRowsModified++;
                });
            }
        }

        // 将新值赋给新列
        resultRows.forEach((row, i) => {
            if (newValues[i] !== null) row[newColName] = newValues[i];
        });

        // 更新状态
        processedData = resultRows;
        lastDedupColName = newColName;
        lsSet('last_dedup_col_name', newColName);
        dedupStatsArea.innerHTML = `
            <span class="dedup-stat">📊 总行: ${resultRows.length}</span>
            <span class="dedup-stat">🔁 重复组: ${groupsModified}</span>
            <span class="dedup-stat">✏️ 去重行: ${totalRowsModified}</span>
            <span class="dedup-stat">🆕 新列: "${newColName}"</span>
        `;
        dedupIntegrationNote.style.display = 'block';
        log(`🎨 颜色去重完成，新增列 "${newColName}"，修改 ${totalRowsModified} 行`, 'success');
        showToastDedup('✅ 去重列已添加，请导出');
        updateDedupFieldHints();
        updateDedupReadyStatus();
        dataStatus.textContent = `✅ 已去重，含列 "${newColName}"`;
    }

    function log(msg, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logArea.appendChild(entry);
        logArea.scrollTop = logArea.scrollHeight;
    }

    function loadConfigs() { return lsGet(LK_CONFIGS, []); }

    function saveConfigs(configs) { lsSet(LK_CONFIGS, configs);
        renderConfigList(); }

    function getCurrentFullConfig() {
        return {
            name: currentConfig.name || '未命名',
            skuColumn: skuColSelect.value,
            parentSkuColumn: parentColSelect.value,
            mapping: mappingEditor ? mappingEditor.getValue() : currentConfig.mapping,
            code: codeEditor ? codeEditor.getValue() : currentConfig.code,
            colorEnum: colorEnumEditor ? colorEnumEditor.getValue() : currentConfig.colorEnum,
            dedupFields: {
                colorType: dedupColorTypeField.value.trim(),
                variantGroup: dedupGroupField.value.trim(),
                amazonColor: dedupColorField.value.trim(),
                sku: dedupSkuField.value.trim(),
                newColName: dedupNewColField.value.trim()
            }
        };
    }

    function applyConfig(cfg) {
        if (cfg.skuColumn && allColumns.includes(cfg.skuColumn)) skuColSelect.value = cfg.skuColumn;
        if (cfg.parentSkuColumn && allColumns.includes(cfg.parentSkuColumn)) parentColSelect.value = cfg
            .parentSkuColumn;
        if (mappingEditor && cfg.mapping) mappingEditor.setValue(cfg.mapping);
        if (codeEditor && cfg.code) codeEditor.setValue(cfg.code);
        if (colorEnumEditor && cfg.colorEnum) { colorEnumEditor.setValue(cfg.colorEnum);
            saveColorEnumFromEditor(); }
        if (cfg.dedupFields) {
            dedupColorTypeField.value = cfg.dedupFields.colorType || '';
            dedupGroupField.value = cfg.dedupFields.variantGroup || '';
            dedupColorField.value = cfg.dedupFields.amazonColor || '';
            dedupSkuField.value = cfg.dedupFields.sku || '';
            dedupNewColField.value = cfg.dedupFields.newColName || '去重后颜色';
            saveDedupFields();
        }
        currentConfig.name = cfg.name || '未命名';
        updateDedupDatalist();
        updateDedupFieldHints();
        updateDedupReadyStatus();
    }

    function renderConfigList() {
        const configs = loadConfigs();
        if (!configs.length) { configListContainer.innerHTML =
                '<span class="text-gray-500 text-sm">暂无方案</span>'; return; }
        configListContainer.innerHTML = configs.map((c, i) => `
            <div class="bg-white/5 border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 text-sm">
                <span>📋 ${esc(c.name)}</span>
                <button class="text-blue-400 hover:text-blue-300" data-apply="${i}">应用</button>
                <button class="text-red-400 hover:text-red-300" data-delete="${i}">删除</button>
            </div>`).join('');
        configListContainer.querySelectorAll('[data-apply]').forEach(b => b.addEventListener('click', e => {
            applyConfig(loadConfigs()[e.target.dataset.apply]);
            log('方案已应用', 'success');
        }));
        configListContainer.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', e => {
            const cfgs = loadConfigs();
            cfgs.splice(e.target.dataset.delete, 1);
            saveConfigs(cfgs);
        }));
    }

    // ... 其余函数保持不变（颜色扫描、AI分类等） ...
    function getColorColumnName() {
        try { const m = JSON.parse(mappingEditor.getValue()); return m.color || null; } catch { return null; }
    }

    function scanColorValues() {
        if (!rawDataRows.length) return [];
        const col = getColorColumnName();
        if (!col || !allColumns.includes(col)) return [];
        const unique = new Set();
        rawDataRows.forEach(r => { const v = String(r[col] || '').trim(); if (v) unique.add(v); });
        return Array.from(unique);
    }

    function findUnmappedColors() {
        const allColors = scanColorValues();
        if (!allColors.length) return [];
        let enumConfig;
        try { enumConfig = JSON.parse(colorEnumEditor.getValue()); } catch { return allColors.map(c => ({
            display: c,
            count: 1
        })); }
        const exactMap = new Map();
        for (const [cat, aliases] of Object.entries(enumConfig)) {
            if (Array.isArray(aliases)) aliases.forEach(a => { const k = String(a).trim().toLowerCase(); if (
                    k) exactMap.set(k, cat); });
        }
        const fuzzyRules = [{ regex: /^[a-z]$/i }, { regex: /^multiple[a-z]*$/i }, { regex: /^multicolou?r[a-z]*$/i },
            { regex: /^mixed\s*colou?r[a-z]*$/i }, { regex: /^mixedcolou?r[a-z]*$/i }, { regex: /^mixed\s+colou?rs?[a-z]*$/i },
            { regex: /^mixed[\s\-_]?colou?r[a-z]*$/i }, { regex: /^mixed\s+colors?[a-z]*$/i }
        ];
        const unmapped = [];
        allColors.forEach(c => {
            const norm = c.toLowerCase();
            if (exactMap.has(norm)) return;
            if (fuzzyRules.some(r => r.regex.test(norm))) return;
            unmapped.push({ display: c, count: 1 });
        });
        return unmapped;
    }

    function updateColorUnmappedMini() {
        const unmapped = findUnmappedColors();
        if (!unmapped.length) { colorUnmappedMini.classList.add('hidden'); return; }
        colorUnmappedMini.classList.remove('hidden');
        const tags = unmapped.slice(0, 15).map(u => `<span class="unmapped-tag">${esc(u.display)}</span>`).join(
            '');
        const more = unmapped.length > 15 ? ` ...及另外${unmapped.length - 15}项` : '';
        colorUnmappedMini.innerHTML =
            `<i class="fa-solid fa-triangle-exclamation text-yellow-400"></i> 未映射: ${tags}${more}`;
    }

    function runProcess() {
        if (!rawDataRows.length) { log('请先加载数据', 'error'); return; }
        const skuCol = skuColSelect.value,
            parentCol = parentColSelect.value;
        if (!skuCol || !parentCol) { log('请选择SKU和父SKU列', 'error'); return; }
        let columns;
        try { columns = JSON.parse(mappingEditor.getValue()); } catch { log('映射JSON格式错误', 'error'); return; }
        columns.sku = skuCol;
        columns.parentSku = parentCol;
        saveColorEnumFromEditor();
        try {
            const fn = new Function('rows', 'columns', 'skuCol', 'parentCol', codeEditor.getValue());
            const result = fn(rawDataRows, columns, skuCol, parentCol);
            if (!Array.isArray(result)) throw new Error('函数必须返回数组');
            processedData = result;
            const newCols = Object.keys(result[0]).filter(c => !allColumns.includes(c) && !c.startsWith(
                '_'));
            log(`✅ 处理完成，${processedData.length}行，新增${newCols.length}列: ${newCols.join(', ')}`, 'success');
            dataStatus.textContent = `✅ 已处理 ${processedData.length} 行`;
            updateColorUnmappedMini();
            updateDedupDatalist();
            updateDedupFieldHints();
            if (!dedupSkuField.value.trim() && skuCol) { dedupSkuField.value = skuCol;
                saveDedupFields(); }
            dedupStatsArea.innerHTML = '';
            dedupIntegrationNote.style.display = 'none';
            lastDedupColName = '';
            updateDedupReadyStatus();
        } catch (e) { log(`❌ 执行错误: ${e.message}`, 'error'); }
    }

    function exportData() {
        if (!processedData.length) { log('无数据可导出', 'error'); return; }
        const allCols = Object.keys(processedData[0]);
        const newCols = allCols.filter(c => !allColumns.includes(c) && !c.startsWith('_'));
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

    function loadSheet() {
        if (!workbook || !currentSheetName) return;
        try {
            const sheet = workbook.Sheets[currentSheetName];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            if (!json.length) { log('工作表为空', 'error'); return; }
            rawDataRows = json;
            allColumns = Object.keys(json[0]);
            const opts = allColumns.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
            skuColSelect.innerHTML = parentColSelect.innerHTML = `<option value="">-- 选择列 --</option>${opts}`;
            skuColSelect.disabled = parentColSelect.disabled = false;
            const find = keys => allColumns.find(c => keys.some(k => c.toLowerCase().includes(k)));
            const sku = find(['sku', '商品编码', '子sku']) || '';
            const parent = find(['父', 'parent', '父sku']) || '';
            skuColSelect.value = sku;
            parentColSelect.value = parent;
            log(`📊 已加载 "${currentSheetName}"，${rawDataRows.length}行`, 'info');
            processedData = [];
            dedupStatsArea.innerHTML = '';
            dedupIntegrationNote.style.display = 'none';
            lastDedupColName = '';
            updateDedupDatalist();
            if (!dedupSkuField.value.trim() && sku) { dedupSkuField.value = sku;
                saveDedupFields(); }
            updateDedupFieldHints();
            updateDedupReadyStatus();
            dataStatus.textContent = `✅ 已加载 ${rawDataRows.length} 行`;
        } catch { log('加载工作表失败', 'error'); }
    }

    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                sheetSelect.innerHTML = workbook.SheetNames.map(n => `<option>${n}</option>`).join('');
                sheetSelect.disabled = false;
                currentSheetName = workbook.SheetNames[0];
                sheetSelect.value = currentSheetName;
                loadSheet();
                log(`📁 文件 "${file.name}" 已加载`, 'info');
            } catch { log('文件解析失败', 'error'); }
        };
        reader.readAsArrayBuffer(file);
    }

    // ... 初始化代码与之前类似，但需添加新字段事件 ...
    function initCollapse(toggle, icon, wrapper, cls, key) {
        const saved = lsGet(key, false);
        wrapper.className = saved ? 'collapsed-content' : cls;
        icon.className = saved ? 'fa-solid fa-chevron-right text-gray-400' :
            'fa-solid fa-chevron-down text-gray-400';
        toggle.addEventListener('click', () => {
            const now = wrapper.classList.contains(cls);
            wrapper.className = now ? 'collapsed-content' : cls;
            icon.className = now ? 'fa-solid fa-chevron-right text-gray-400' :
                'fa-solid fa-chevron-down text-gray-400';
            lsSet(key, now);
            if (mappingEditor && wrapper === mappingCollapseWrapper) setTimeout(() => mappingEditor
                .refresh(), 350);
            if (codeEditor && wrapper === codeCollapseWrapper) setTimeout(() => codeEditor.refresh(),
                350);
            if (colorEnumEditor && wrapper === colorEnumCollapseWrapper) setTimeout(() =>
                colorEnumEditor.refresh(), 350);
        });
    }

    function toggleFullscreen(card, editor, btn) {
        const is = card.classList.contains('fullscreen-card');
        card.classList.toggle('fullscreen-card');
        btn.innerHTML = is ? '<i class="fa-solid fa-expand"></i>' : '<i class="fa-solid fa-compress"></i>';
        if (editor) setTimeout(() => { editor.refresh();
            editor.setSize('100%', is ? 'auto' : '100%'); }, 100);
    }

    // AI分类 (保持)
    async function callAI(unmapped) {
        const key = aiApiKey.value.trim();
        if (!key) { alert('请填写API密钥'); return null; }
        try {
            const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({
                    model: aiModel.value,
                    messages: [{ role: 'system', content: aiPrompt.value.trim() ||
                            DEFAULT_AI_PROMPT }, { role: 'user', content: unmapped.join('\n') }
                    ],
                    temperature: 0.1,
                    max_tokens: 2000
                })
            });
            if (!res.ok) throw new Error(`API错误 ${res.status}`);
            const data = await res.json();
            const match = data.choices[0].message.content.match(/\[[\s\S]*\]/);
            if (!match) throw new Error('未返回JSON');
            return JSON.parse(match[0]);
        } catch (e) { alert('AI分类失败: ' + e.message); return null; }
    }

    function showAISuggestions(suggestions) {
        aiModalContainer.innerHTML = '';
        const overlay = document.createElement('div');
        overlay.className = 'ai-modal-overlay';
        overlay.innerHTML = `
            <div class="ai-modal">
                <h3 class="text-xl font-bold mb-3"><i class="fa-solid fa-robot text-purple-400"></i> AI建议</h3>
                <div class="max-h-60 overflow-y-auto mb-4">${suggestions.map(s => `<div class="ai-suggestion-item"><span>${esc(s.value)} → <b class="text-green-400">${esc(s.key)}</b></span></div>`).join('')}</div>
                <div class="flex justify-end gap-3"><button class="btn-glass" id="aiCancelBtn">取消</button><button class="btn-glass btn-primary" id="aiApplyBtn"><i class="fa-solid fa-check"></i> 应用</button></div>
            </div>`;
        aiModalContainer.appendChild(overlay);
        const close = () => aiModalContainer.innerHTML = '';
        $('aiCancelBtn').addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        $('aiApplyBtn').addEventListener('click', () => {
            try {
                let cfg = JSON.parse(colorEnumEditor.getValue());
                suggestions.forEach(({ key, value }) => {
                    if (!key || !value) return;
                    if (!cfg[key]) cfg[key] = [];
                    if (!cfg[key].includes(value)) cfg[key].push(value);
                });
                colorEnumEditor.setValue(JSON.stringify(cfg, null, 2));
                saveColorEnumFromEditor();
                updateColorUnmappedMini();
                close();
                log('✅ AI建议已应用', 'success');
            } catch (e) { alert('合并失败'); }
        });
    }

    aiClassifyBtn.addEventListener('click', async () => {
        saveColorEnumFromEditor();
        const unmapped = findUnmappedColors().map(u => u.display);
        if (!unmapped.length) { alert('没有未映射颜色'); return; }
        aiClassifyBtn.disabled = true;
        const suggestions = await callAI(unmapped);
        aiClassifyBtn.disabled = false;
        if (suggestions && suggestions.length) showAISuggestions(suggestions);
    });

    function createStars() {
        const c = $('stars');
        const colors = ['#60a5fa', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#f87171', '#38bdf8',
        '#fb923c'];
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

    function initEditors() {
        mappingEditor = CodeMirror(mappingContainer, { value: DEFAULT_MAPPING, mode: { name: 'javascript',
                json: true }, theme: 'material-darker', lineNumbers: true, tabSize: 2 });
        mappingEditor.setSize('100%', '100px');
        colorEnumEditor = CodeMirror(colorEnumContainer, { value: JSON.stringify(getStoredColorEnum(),
                null, 2), mode: { name: 'javascript', json: true }, theme: 'material-darker',
            lineNumbers: true, tabSize: 2 });
        colorEnumEditor.setSize('100%', '220px');
        colorEnumEditor.on('change', () => { saveColorEnumFromEditor();
            updateColorUnmappedMini(); });
        codeEditor = CodeMirror(codeContainer, { value: DEFAULT_CODE, mode: 'javascript',
            theme: 'material-darker', lineNumbers: true, tabSize: 2, viewportMargin: Infinity });
        codeEditor.setSize('100%', '420px');
    }

    // 绑定事件
    dedupRunBtn.addEventListener('click', runColorDedup);
    dedupResetFieldsBtn.addEventListener('click', resetDedupFieldsToDefault);
    [dedupColorTypeField, dedupGroupField, dedupColorField, dedupSkuField, dedupNewColField].forEach(el => {
        el.addEventListener('input', () => { saveDedupFields();
            updateDedupFieldHints();
            updateDedupReadyStatus(); });
        el.addEventListener('focus', () => updateDedupDatalist());
    });
    fileInput.addEventListener('change', e => e.target.files[0] && handleFile(e.target.files[0]));
    loadSheetBtn.addEventListener('click', () => { if (workbook) { currentSheetName = sheetSelect.value;
            loadSheet(); } });
    runProcessBtn.addEventListener('click', runProcess);
    exportBtn.addEventListener('click', exportData);
    saveConfigBtn.addEventListener('click', () => {
        const name = prompt('方案名称：', currentConfig.name || '新方案');
        if (!name) return;
        const cfgs = loadConfigs();
        const cfg = getCurrentFullConfig();
        cfg.name = name;
        const idx = cfgs.findIndex(c => c.name === name);
        if (idx >= 0) cfgs[idx] = cfg;
        else cfgs.push(cfg);
        saveConfigs(cfgs);
        currentConfig.name = name;
        log('方案已保存', 'success');
    });
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
            try { saveConfigs(JSON.parse(ev.target.result));
                log('导入成功', 'success'); } catch { log('无效JSON', 'error'); }
            importConfigFile.value = '';
        };
        r.readAsText(f);
    });
    resetMappingBtn.addEventListener('click', () => mappingEditor.setValue(DEFAULT_MAPPING));
    resetCodeBtn.addEventListener('click', () => codeEditor.setValue(DEFAULT_CODE));
    resetColorEnumBtn.addEventListener('click', () => {
        colorEnumEditor.setValue(JSON.stringify(DEFAULT_COLOR_ENUM, null, 2));
        saveColorEnumFromEditor();
        updateColorUnmappedMini();
    });
    document.body.addEventListener('dragover', e => e.preventDefault());
    document.body.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e
            .dataTransfer.files[0]); });
    mappingFullscreenBtn.addEventListener('click', e => { e.stopPropagation();
        toggleFullscreen(mappingCard, mappingEditor, mappingFullscreenBtn); });
    colorEnumFullscreenBtn.addEventListener('click', e => { e.stopPropagation();
        toggleFullscreen(colorEnumCard, colorEnumEditor, colorEnumFullscreenBtn); });
    codeFullscreenBtn.addEventListener('click', e => { e.stopPropagation();
        toggleFullscreen(codeCard, codeEditor, codeFullscreenBtn); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (mappingCard.classList.contains('fullscreen-card')) toggleFullscreen(mappingCard,
                mappingEditor, mappingFullscreenBtn);
            if (colorEnumCard.classList.contains('fullscreen-card')) toggleFullscreen(colorEnumCard,
                colorEnumEditor, colorEnumFullscreenBtn);
            if (codeCard.classList.contains('fullscreen-card')) toggleFullscreen(codeCard, codeEditor,
                codeFullscreenBtn);
        }
    });
    const aiCollapsed = lsGet(LK_AI_COLLAPSED, true);
    aiSettingsContent.className = aiCollapsed ? 'collapsed-content' : 'expanded-content';
    aiSettingsIcon.className = aiCollapsed ? 'fa-solid fa-chevron-right text-gray-500' :
        'fa-solid fa-chevron-down text-gray-500';
    aiSettingsToggle.addEventListener('click', () => {
        const now = aiSettingsContent.classList.contains('expanded-content');
        aiSettingsContent.className = now ? 'collapsed-content' : 'expanded-content';
        aiSettingsIcon.className = now ? 'fa-solid fa-chevron-right text-gray-500' :
            'fa-solid fa-chevron-down text-gray-500';
        lsSet(LK_AI_COLLAPSED, now);
    });
    skuColSelect.addEventListener('change', () => {
        if (!dedupSkuField.value.trim() && skuColSelect.value) { dedupSkuField.value = skuColSelect
                .value;
            saveDedupFields(); }
        updateDedupDatalist();
    });
    parentColSelect.addEventListener('change', () => updateDedupDatalist());

    // 恢复上次去重列名
    lastDedupColName = lsGet('last_dedup_col_name', '');

    createStars();
    initEditors();
    loadAISettings();
    loadDedupFieldsToUI();
    initCollapse(mappingToggleHeader, mappingToggleIcon, mappingCollapseWrapper, 'expanded-content-mapping',
        LK_MAPPING_COLLAPSED);
    initCollapse(colorEnumToggleHeader, colorEnumToggleIcon, colorEnumCollapseWrapper,
        'expanded-content-color-enum', LK_COLOR_COLLAPSED);
    initCollapse(codeToggleHeader, codeToggleIcon, codeCollapseWrapper, 'expanded-content', LK_CODE_COLLAPSED);
    const dedupSaved = lsGet(LK_DEDUP_COLLAPSED, false);
    dedupCollapseWrapper.className = dedupSaved ? 'collapsed-content' : 'expanded-content-dedup';
    dedupToggleIcon.className = dedupSaved ? 'fa-solid fa-chevron-right text-gray-400' :
        'fa-solid fa-chevron-down text-gray-400';
    dedupToggleHeader.addEventListener('click', () => {
        const now = dedupCollapseWrapper.classList.contains('expanded-content-dedup');
        dedupCollapseWrapper.className = now ? 'collapsed-content' : 'expanded-content-dedup';
        dedupToggleIcon.className = now ? 'fa-solid fa-chevron-right text-gray-400' :
            'fa-solid fa-chevron-down text-gray-400';
        lsSet(LK_DEDUP_COLLAPSED, now);
    });
    renderConfigList();
    updateDedupDatalist();
    updateDedupFieldHints();
    updateDedupReadyStatus();
    log('🚀 系统就绪，上传Excel后依次执行“处理”与“颜色去重”，最后导出（去重列将包含在内）');
})();
