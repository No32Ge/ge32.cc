
// 封装所有 localStorage 读写操作，集中管理键名与默认值

// 本地存储键名常量
const STORAGE_KEYS = {
    COLOR_ENUM: 'color_enum_config_fusion',
    AI_KEY: 'color_ai_api_key_fusion',
    AI_MODEL: 'color_ai_model_fusion',
    AI_PROMPT: 'color_ai_prompt_fusion',
    COLOR_COLLAPSED: 'color_enum_collapsed_fusion',
    AI_COLLAPSED: 'color_ai_collapsed_fusion',
    MAPPING_COLLAPSED: 'mapping_editor_collapsed_fusion',
    CODE_COLLAPSED: 'code_editor_collapsed_fusion',
    CONFIGS: 'variant_gen_configs_fusion_v3',
    DEDUP_COLLAPSED: 'color_dedup_collapsed_fusion',
    DEDUP_FIELDS: 'color_dedup_fields_fusion',
    LAST_DEDUP_COL: 'last_dedup_col_name'
};

// 默认颜色枚举
const DEFAULT_COLOR_ENUM = {
    "Green": ["mint green", "army green", "light green", "dark green", "grean", "greem", "gteen", "green ", " green"],
    "Gold": ["rose gold", "rosegold", "rose-gold"],
    "Blue": ["sky blue", "light blue", "light bule", "light b lue", "dark blue", "navy", "navy blue", "bleu", "bule", "bluw"],
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

const DEFAULT_AI_PROMPT = `你是一个颜色分类专家。请将以下颜色名称映射到标准类别。\n标准类别包括: Green, Gold, Blue, Brown, Red, Silver, Gray, Clear, Black, White, Yellow, Orange, Pink, Purple, Beige, Multicolor 等。\n规则:\n- 拼写错误应映射到正确颜色 (如 "bule" -> "Blue")\n- 包含多种颜色的名称 (如 "Blue,Red") 应归类为 "Multicolor"\n- 缩写需展开 (如 "GN" -> "Green")\n- 材质/纹理描述 (如 "wood", "camouflage") 归入合理颜色或 Multicolor\n- 无法判断的归入 "Multicolor"\n请返回JSON数组，格式: [{"key":"标准类别","value":"原始颜色名称"}, ...] 只返回JSON，不要其他内容。`;

const DEFAULT_DEDUP_FIELDS = {
    colorType: '颜色类型',
    variantGroup: 'Variant Group ID',
    amazonColor: 'Color Classification',
    sku: '',
    newColName: '去重后颜色'
};

// 通用存取
function lsGet(key, defaultValue) {
    try {
        const val = localStorage.getItem(key);
        return val !== null ? JSON.parse(val) : defaultValue;
    } catch {
        return defaultValue;
    }
}

function lsSet(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch { /* 忽略存储错误 */ }
}

export const ConfigManager = {
    // ---- 颜色枚举 ----
    getColorEnum() {
        return lsGet(STORAGE_KEYS.COLOR_ENUM, DEFAULT_COLOR_ENUM);
    },

    saveColorEnum(config) {
        if (config && typeof config === 'object') lsSet(STORAGE_KEYS.COLOR_ENUM, config);
    },

    // ---- AI 设置 ----
    getAISettings() {
        return {
            apiKey: lsGet(STORAGE_KEYS.AI_KEY, ''),
            model: lsGet(STORAGE_KEYS.AI_MODEL, 'deepseek-chat'),
            prompt: lsGet(STORAGE_KEYS.AI_PROMPT, DEFAULT_AI_PROMPT)
        };
    },

    saveAISettings({ apiKey, model, prompt }) {
        lsSet(STORAGE_KEYS.AI_KEY, apiKey);
        lsSet(STORAGE_KEYS.AI_MODEL, model);
        lsSet(STORAGE_KEYS.AI_PROMPT, prompt);
    },

    // ---- 面板折叠状态 ----
    getCollapsedState(key) {
        const mapping = {
            'colorEnum': STORAGE_KEYS.COLOR_COLLAPSED,
            'ai': STORAGE_KEYS.AI_COLLAPSED,
            'mapping': STORAGE_KEYS.MAPPING_COLLAPSED,
            'code': STORAGE_KEYS.CODE_COLLAPSED,
            'dedup': STORAGE_KEYS.DEDUP_COLLAPSED
        };
        return lsGet(mapping[key], false);
    },

    saveCollapsedState(key, collapsed) {
        const mapping = {
            'colorEnum': STORAGE_KEYS.COLOR_COLLAPSED,
            'ai': STORAGE_KEYS.AI_COLLAPSED,
            'mapping': STORAGE_KEYS.MAPPING_COLLAPSED,
            'code': STORAGE_KEYS.CODE_COLLAPSED,
            'dedup': STORAGE_KEYS.DEDUP_COLLAPSED
        };
        if (mapping[key]) lsSet(mapping[key], collapsed);
    },

    // ---- 去重字段配置 ----
    getDedupFields() {
        const saved = lsGet(STORAGE_KEYS.DEDUP_FIELDS, DEFAULT_DEDUP_FIELDS);
        if (!saved || typeof saved !== 'object') return { ...DEFAULT_DEDUP_FIELDS };
        return {
            colorType: saved.colorType || DEFAULT_DEDUP_FIELDS.colorType,
            variantGroup: saved.variantGroup || DEFAULT_DEDUP_FIELDS.variantGroup,
            amazonColor: saved.amazonColor || DEFAULT_DEDUP_FIELDS.amazonColor,
            sku: saved.sku || DEFAULT_DEDUP_FIELDS.sku,
            newColName: saved.newColName || DEFAULT_DEDUP_FIELDS.newColName
        };
    },

    saveDedupFields(fields) {
        lsSet(STORAGE_KEYS.DEDUP_FIELDS, fields);
    },

    // ---- 去重列名追踪 ----
    getLastDedupColName() {
        return lsGet(STORAGE_KEYS.LAST_DEDUP_COL, '');
    },

    saveLastDedupColName(name) {
        lsSet(STORAGE_KEYS.LAST_DEDUP_COL, name);
    },

    // ---- 完整方案管理 ----
    loadConfigs() {
        return lsGet(STORAGE_KEYS.CONFIGS, []);
    },

    saveConfigs(configs) {
        lsSet(STORAGE_KEYS.CONFIGS, configs);
    },

    // ---- 导出默认值（供外部使用） ----
    getDefaults() {
        return {
            COLOR_ENUM: DEFAULT_COLOR_ENUM,
            AI_PROMPT: DEFAULT_AI_PROMPT,
            DEDUP_FIELDS: DEFAULT_DEDUP_FIELDS
        };
    }
};
