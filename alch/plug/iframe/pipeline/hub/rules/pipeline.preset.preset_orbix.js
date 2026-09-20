/**
 * [Pipeline Atomic Preset Plugin] obrix下游汇整
 * ID: preset_mu9rwmar
 */
(function(global) {
    'use strict';
    const ENGINE_KEY = '__EXCEL_PIPELINE_ENGINE__';
    const manifest = {
    "id": "preset_mu9rwmar",
    "name": "obrix下游汇整",
    "version": "1.0.0",
    "createdAt": "2026-09-20T12:09:23.403Z",
    "externalScripts": [],
    "steps": [
        {
            "stepIndex": 1,
            "colName": "SKU",
            "code": "row['子ASIN']"
        },
        {
            "stepIndex": 2,
            "colName": "父SKU",
            "code": "row[\"父ASIN\"]"
        },
        {
            "stepIndex": 3,
            "colName": "条码类型",
            "code": "\"EAN\""
        },
        {
            "stepIndex": 4,
            "colName": "价格",
            "code": "// 1. 获取售价并转为字符串\nconst rawStr = String(row['售价'] || row['price'] || '').trim();\n\n// 2. 正则提取首个有效金额数字（防止被后面的 savings/数字干扰）\nconst match = rawStr.match(/(\\d+(?:\\.\\d+)?)/);\nconst price = match ? parseFloat(match[1]) : 0;\n\nif (price <= 0) return 0;\n\n// 3. 业务规则：大于 50 加 25% (* 1.25)，小于等于 50 加 30% (* 1.30)\nconst rate = price > 50 ? 1.25 : 1.30;\nconst finalPrice = price * rate;\n\n// 4. 固定以 9 结尾（先保留两位小数，再将最后一位强制替换为 9，如 50.00 -> 50.09）\nconst resultWith9 = finalPrice.toFixed(2).replace(/\\d$/, '9');\n\nreturn Number(resultWith9);"
        },
        {
            "stepIndex": 5,
            "colName": "品牌名",
            "code": "\"Unbranded\""
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
