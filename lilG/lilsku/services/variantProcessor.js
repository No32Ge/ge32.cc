
// 变体组处理核心，负责安全执行用户定义的代码

/**
 * 工具函数：提取第一材质
 * @param {string} raw - 原始材质字符串
 * @returns {string} 提取后的材质名称
 */
function extractFirstMaterial(raw) {
    if (!raw || typeof raw !== "string") return "";
    let trimmed = raw.trim();
    if (trimmed === "") return "";
    let splitBySeparators = (text) => {
        let normalized = text.replace(/，/g, ",").replace(/﹢/g, "+").replace(/＆/g, "&");
        let parts = normalized.split(/\s*[,+&\/|]\s*|\s+and\s+|\s*\+\s*/);
        let filtered = parts.filter(p => p.trim().length > 0);
        return filtered.length ? filtered : [text];
    };
    let segments = splitBySeparators(trimmed);
    let firstSegment = segments[0] ? segments[0].trim() : trimmed;
    let cleaned = firstSegment.replace(/\d+(?:\.\d+)?%/g, "");
    const materialWordRegex = /[A-Za-z\u00C0-\u024F\u0400-\u04FF]+(?:[\s-][A-Za-z\u00C0-\u024F\u0400-\u04FF]+)*/;
    let match = cleaned.match(materialWordRegex);
    if (match && match[0]) {
        cleaned = match[0].trim();
    } else {
        let onlyAlpha = cleaned.replace(/[^\p{L}\s-]/gu, "").trim();
        cleaned = onlyAlpha || firstSegment.replace(/[\d%]/g, "").replace(/[^\w\s\u4e00-\u9fa5-]/g, "").trim() || firstSegment.replace(/[^\p{L}]/gu, "").trim() || firstSegment;
    }
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    return cleaned || "未识别";
}

/**
 * 执行用户定义的处理函数，并返回结果
 * @param {Array<Object>} rows - 原始数据行
 * @param {Object} columns - 列映射，如 { weight: "重量(g)", color: "颜色" }
 * @param {string} skuCol - SKU 列名
 * @param {string} parentCol - 父 SKU 列名
 * @param {string} userCode - 用户编写的处理函数代码字符串（应为 return (function(...) { ... }) 格式）
 * @param {Function} normalizeColorFn - 颜色标准化函数，由外部注入
 * @returns {Array<Object>} 处理后的数据行
 */
export function processVariants(rows, columns, skuCol, parentCol, userCode, normalizeColorFn) {
    if (!rows.length) throw new Error('数据为空');
    if (!skuCol || !parentCol) throw new Error('请选择SKU和父SKU列');

    // 通过 new Function 执行用户代码，并注入参数
    const fnBody = `"use strict"; ${userCode}`;
    let processor;
    try {
        processor = new Function(fnBody)();
    } catch (e) {
        throw new Error('代码编译错误: ' + e.message);
    }

    if (typeof processor !== 'function') {
        throw new Error('代码必须返回一个函数');
    }

    let result;
    try {
        result = processor(rows, columns, skuCol, parentCol);
    } catch (e) {
        throw new Error('执行错误: ' + e.message);
    }

    if (!Array.isArray(result)) {
        throw new Error('函数必须返回数组');
    }
    return result;
}
