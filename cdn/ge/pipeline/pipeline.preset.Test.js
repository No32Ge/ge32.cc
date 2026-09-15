/**
 * [Pipeline Atomic Preset Plugin] kso
 * ID: Test
 */
(function(global) {
    'use strict';
    const ENGINE_KEY = '__EXCEL_PIPELINE_ENGINE__';
    const manifest = {
    "id": "Test",
    "name": "kso",
    "version": "1.0.0",
    "createdAt": "2026-09-15T02:42:59.031Z",
    "externalScripts": [
        "https://www.ge32.cc/cdn/ge/simple-classifier.js",
        "https://www.ge32.cc/cdn/ge/dict/dict.color.js.js",
        "https://www.ge32.cc/cdn/ge/dict/dict.shipping-rate.js"
    ],
    "steps": [
        {
            "stepIndex": 1,
            "colName": "assembledProductLength",
            "code": "const val = parseFloat(String(row['长'] || row['长(cm)'] || row['length'] || 0).replace(/[^0-9.]/g, '')) || 0;\nreturn Number((val / 2.54).toFixed(2));"
        },
        {
            "stepIndex": 2,
            "colName": "assembledProductWidth",
            "code": "const val = parseFloat(String(row['宽'] || row['宽(cm)'] || row['width'] || 0).replace(/[^0-9.]/g, '')) || 0;\nreturn Number((val / 2.54).toFixed(2));"
        },
        {
            "stepIndex": 3,
            "colName": "assembledProductHeight",
            "code": "const val = parseFloat(String(row['高'] || row['高(cm)'] || row['height'] || 0).replace(/[^0-9.]/g, '')) || 0;\nreturn Number((val / 2.54).toFixed(2));"
        },
        {
            "stepIndex": 4,
            "colName": "netContentStatement",
            "code": "const val = parseFloat(String(row['重量'] || row['重量(g)'] || row['实际重量'] || 0).replace(/[^0-9.]/g, '')) || 0;\nconst lbs = (val / 453.59237).toFixed(2);\nreturn lbs + ' lb';"
        },
        {
            "stepIndex": 5,
            "colName": "Material Classification",
            "code": "const raw = String(row['英文材质'] || row['材质'] || row['Material'] || '').trim();\nreturn raw.replace(/\\d+(?:\\.\\d+)?%/g, '').replace(/\\s+/g, ' ').trim();"
        },
        {
            "stepIndex": 6,
            "colName": "Color Classification",
            "code": "if (window.__CUSTOM_ENUM_CLASSIFIER_TOOL__ && window.__DICTS__) {\n    return window.__CUSTOM_ENUM_CLASSIFIER_TOOL__.create(window.__DICTS__.color).classify(row['亚马逊美国站颜色'] || row['颜色'], 'Multicolor');\n}\nreturn row['亚马逊美国站颜色'] || 'Multicolor';"
        },
        {
            "stepIndex": 7,
            "colName": "Walmart_Color",
            "code": "const rawParent = row['父SKU'];\nconst rawColor = row['Color Classification'];\nconst color = (rawColor !== undefined && rawColor !== null) ? String(rawColor).trim() : '';\nconst parentSku = (rawParent !== undefined && rawParent !== null) ? String(rawParent).trim() : '';\nconst isNoParent = !parentSku || ['null', 'undefined', 'n/a', 'none', '-', ''].includes(parentSku.toLowerCase());\n\nif (isNoParent || !color) return color;\n\nconst currentP = parentSku.toLowerCase();\nconst currentC = color.toLowerCase();\nlet totalMatch = 0;\nlet currentRank = 0;\n\nfor (let i = 0; i < total; i++) {\n    const r = rows[i];\n    const p = String(r['父SKU'] || '').trim().toLowerCase();\n    const c = String(r['Color Classification'] || '').trim().toLowerCase();\n    if (p === currentP && c === currentC) {\n        totalMatch++;\n        if (i <= index) currentRank++;\n    }\n}\n\nif (totalMatch <= 1) return color;\n\nfunction getLetterCode(num) {\n    let s = '';\n    while (num > 0) {\n        let m = (num - 1) % 26;\n        s = String.fromCharCode(65 + m) + s;\n        num = Math.floor((num - 1) / 26);\n    }\n    return s;\n}\n\nreturn `${color}-${getLetterCode(currentRank)}`;"
        },
        {
            "stepIndex": 8,
            "colName": "实际重量",
            "code": "// 提取数值并过滤掉可能夹带的单位（如 g、kg 等字母或空格）\nconst w1 = parseFloat(String(row['重量(g)'] || 0).replace(/[^0-9.]/g, '')) || 0;\nconst w2 = parseFloat(String(row['泡重'] || 0).replace(/[^0-9.]/g, '')) || 0;\n\n// 返回两者中较大的数值（可根据需要保留小数，如 .toFixed(2)）\nreturn Math.max(w1, w2);"
        },
        {
            "stepIndex": 9,
            "colName": "finalUsdPrice",
            "code": "// ========== 基础配置 ==========\nconst EXCHANGE_RATE = 6.5; // 手动汇率\nconst PROFIT_FACTOR_LOW  = 0.50;\nconst PROFIT_FACTOR_MID  = 0.52;\nconst PROFIT_FACTOR_HIGH = 0.65;\n\n// 1. 提取实际重量与成本价\nconst weight = parseFloat(String(row['实际重量'] || 0).replace(/[^0-9.]/g, '')) || 0;\nconst skuPrice = parseFloat(String(row['SKU价(￥)'] || row['SKU价'] || 0).replace(/[^0-9.]/g, '')) || 0;\n\n// 2. 重量进位分段\nfunction getWeightBucket(w) {\n    return Math.round((w + 4.99) / 10) * 10;\n}\n\n// 3. 运费查询（完美适配二维数组）\nfunction getShippingCost(w) {\n    const bucket = getWeightBucket(w);\n    const rawRates = window.__DICTS__ && window.__DICTS__.shippingRate;\n    if (!rawRates) return 999;\n\n    // 如果未构建缓存 Map，则初始化缓存（只在第一行构建一次，后续行直接毫秒级读取）\n    if (!window._shippingRateMapCache) {\n        if (Array.isArray(rawRates)) {\n            // 原生支持将 [[240, 31.28], ...] 转为 Map 快速检索\n            window._shippingRateMapCache = new Map(rawRates);\n        } else if (rawRates instanceof Map) {\n            window._shippingRateMapCache = rawRates;\n        } else {\n            window._shippingRateMapCache = new Map(Object.entries(rawRates));\n        }\n    }\n\n    const cost = window._shippingRateMapCache.get(bucket) \n              ?? window._shippingRateMapCache.get(String(bucket));\n    return (cost !== undefined && cost !== null) ? Number(cost) : 999;\n}\n\n// 4. 阶段成本与定价推导\nconst shippingCNY = getShippingCost(weight);\nconst totalCNY = skuPrice + shippingCNY;\nconst usdBase = totalCNY / EXCHANGE_RATE;\n\nlet profitFactor = usdBase <= 5 ? PROFIT_FACTOR_LOW\n                 : usdBase <= 15 ? PROFIT_FACTOR_MID\n                 : PROFIT_FACTOR_HIGH;\n\nconst finalPrice = usdBase / profitFactor;\nreturn Number((Math.round(finalPrice * 100) / 100).toFixed(2));"
        }
    ]
};

    if (global[ENGINE_KEY] && global[ENGINE_KEY].hub && typeof global[ENGINE_KEY].hub.register === 'function') {
        global[ENGINE_KEY].hub.register(manifest);
    } else {
        global.__PIPELINE_EARLY_PLUGINS__ = global.__PIPELINE_EARLY_PLUGINS__ || [];
        global.__PIPELINE_EARLY_PLUGINS__.push(manifest);
    }
})(typeof window !== 'undefined' ? window : this);
