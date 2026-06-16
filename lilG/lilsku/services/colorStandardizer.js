
// 颜色标准化引擎，基于枚举配置和模糊规则

let colorExactMap = new Map();
const colorFuzzyRules = [
    { regex: /^[a-z]$/i, target: "Multicolor" },
    { regex: /^multiple[a-z]*$/i, target: "Multicolor" },
    { regex: /^multicolour[a-z]*$/i, target: "Multicolor" },
    { regex: /^multicolor[a-z]*$/i, target: "Multicolor" },
    { regex: /^mixed\s*colou?r[a-z]*$/i, target: "Multicolor" },
    { regex: /^mixedcolou?r[a-z]*$/i, target: "Multicolor" },
    { regex: /^mixed\s+colou?rs?[a-z]*$/i, target: "Multicolor" },
    { regex: /^mixed[\s\-_]?colou?r[a-z]*$/i, target: "Multicolor" },
    { regex: /^mixed\s+colors?[a-z]*$/i, target: "Multicolor" }
];

/**
 * 根据枚举配置重建精确映射
 * @param {Object} colorEnumConfig - 格式: { "Green": ["mint green", ...], ... }
 */
export function buildColorMap(colorEnumConfig) {
    const map = new Map();
    for (const [category, aliases] of Object.entries(colorEnumConfig)) {
        if (Array.isArray(aliases)) {
            aliases.forEach(alias => {
                const key = String(alias).trim().toLowerCase();
                if (key) map.set(key, category);
            });
        }
    }
    colorExactMap = map;
}

/**
 * 标准化单个颜色名称
 * @param {string} raw - 原始颜色字符串
 * @returns {string} 标准化后的颜色名称，若无法识别则返回原始字符串
 */
export function normalizeColor(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (trimmed === '') return '';
    const norm = trimmed.toLowerCase();
    const mapped = colorExactMap.get(norm);
    if (mapped) return mapped;
    for (const rule of colorFuzzyRules) {
        if (rule.regex.test(norm)) return rule.target;
    }
    return trimmed;
}

/**
 * 扫描数据中未映射的颜色值
 * @param {Array} allColors - 所有出现的颜色字符串数组
 * @param {Object} colorEnumConfig - 当前颜色枚举配置（可选，若不传则使用已构建的映射）
 * @returns {Array<{display: string, count: number}>} 未映射的颜色列表
 */
export function findUnmappedColors(allColors, colorEnumConfig = null) {
    if (colorEnumConfig) buildColorMap(colorEnumConfig);
    const unique = [...new Set(allColors.map(c => String(c || '').trim()).filter(Boolean))];
    const unmapped = [];
    unique.forEach(c => {
        const norm = c.toLowerCase();
        if (colorExactMap.has(norm)) return;
        if (colorFuzzyRules.some(r => r.regex.test(norm))) return;
        unmapped.push({ display: c, count: 1 }); // count 可后续统计，这里简单写1
    });
    return unmapped;
}
