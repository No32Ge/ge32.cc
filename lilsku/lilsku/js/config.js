
// ============== 配置常量（挂载到 window） ==============
(function() {
    const LK_COLOR_ENUM = 'color_enum_config_fusion';
    const LK_COLOR_COLLAPSED = 'color_enum_collapsed_fusion';
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
    const DEFAULT_DEDUP_FIELDS = {
        inputField: '',
        groupField: 'Variant Group ID',
        outputField: '去重后值',
        mode: 'letter'
    };

    const DEFAULT_MAPPING = JSON.stringify({
        weight: '重量(g)',
        length: '长',
        width: '宽',
        height: '高',
        material: '面料成分',
        color: '亚马逊美国站颜色'
    }, null, 2);

    const LK_PRICE_RATE = 'ge32_exchange_rate';
    const LK_PRICE_FORMULA = 'ge32_formula_code';
    const LK_PRICE_COLLAPSED = 'ge32_formula_collapsed';
    const LK_PRICE_FIELDS = 'ge32_price_fields';
    const LK_LAST_PRICE_COLS = 'last_price_cols';

    const DEFAULT_PRICE_RATE = 7.2;

    const DEFAULT_PRICE_FORMULA = [
        'function compute(row, shippingRates, exchangeRate) {',
        '    const PROFIT_FACTOR_LOW  = 0.5;',
        '    const PROFIT_FACTOR_MID  = 0.52;',
        '    const PROFIT_FACTOR_HIGH = 0.65;',
        '',
        '    function getWeightBucket(w) {',
        '        return Math.round((w + 4.99) / 10) * 10;',
        '    }',
        '',
        '    function getShippingCost(w) {',
        '        const bucket = getWeightBucket(w);',
        '        return shippingRates.get(bucket) ?? 999;',
        '    }',
        '',
        '    const weight = parseFloat(row.weight) || 0;',
        '    const volWeight = parseFloat(row.volWeight) || 0;',
        '    const skuPrice = parseFloat(row.skuPrice) || 0;',
        '',
        '    const actualWeight = Math.max(weight, volWeight);',
        '    const shippingCNY = getShippingCost(actualWeight);',
        '    const totalCNY = skuPrice + shippingCNY;',
        '    const usdBase = totalCNY / exchangeRate;',
        '',
        '    let profitFactor = usdBase <= 5 ? PROFIT_FACTOR_LOW',
        '                     : usdBase <= 15 ? PROFIT_FACTOR_MID',
        '                     : PROFIT_FACTOR_HIGH;',
        '',
        '    const finalPrice = usdBase / profitFactor;',
        '',
        '    return {',
        '        actualWeight,',
        '        shippingCNY,',
        '        totalCNY,',
        '        finalUsdPrice: Math.round(finalPrice * 100) / 100',
        '    };',
        '}'
    ].join('\n');

    const DEFAULT_PRICE_FIELDS = { skuPriceCol: '', weightCol: '', volWeightCol: '' };

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

    window.LK_COLOR_ENUM = LK_COLOR_ENUM;
    window.LK_COLOR_COLLAPSED = LK_COLOR_COLLAPSED;
    window.LK_MAPPING_COLLAPSED = LK_MAPPING_COLLAPSED;
    window.LK_CODE_COLLAPSED = LK_CODE_COLLAPSED;
    window.LK_CONFIGS = LK_CONFIGS;
    window.LK_DEDUP_COLLAPSED = LK_DEDUP_COLLAPSED;
    window.LK_DEDUP_FIELDS = LK_DEDUP_FIELDS;

    window.LK_PRICE_RATE = LK_PRICE_RATE;
    window.LK_PRICE_FORMULA = LK_PRICE_FORMULA;
    window.LK_PRICE_COLLAPSED = LK_PRICE_COLLAPSED;
    window.LK_PRICE_FIELDS = LK_PRICE_FIELDS;
    window.LK_LAST_PRICE_COLS = LK_LAST_PRICE_COLS;

    window.DEFAULT_COLOR_ENUM = DEFAULT_COLOR_ENUM;
    window.DEFAULT_DEDUP_FIELDS = DEFAULT_DEDUP_FIELDS;
    window.DEFAULT_MAPPING = DEFAULT_MAPPING;
    window.DEFAULT_CODE = DEFAULT_CODE;
    window.DEFAULT_PRICE_RATE = DEFAULT_PRICE_RATE;
    window.DEFAULT_PRICE_FORMULA = DEFAULT_PRICE_FORMULA;
    window.DEFAULT_PRICE_FIELDS = DEFAULT_PRICE_FIELDS;
})();
