/**
 * [Pipeline Atomic Preset Plugin] MAX_Obrix
 * ID: preset_mudijmb5
 */
(function(global) {
    'use strict';
    const ENGINE_KEY = '__EXCEL_PIPELINE_ENGINE__';
    const manifest = {
    "id": "preset_mudijmb5",
    "name": "MAX_Obrix",
    "version": "1.0.0",
    "createdAt": "2026-09-23T02:58:30.344Z",
    "externalScripts": [],
    "steps": [
        {
            "stepIndex": 1,
            "colName": "SKU",
            "code": "// 这里面代表把你的ASIN转化成SKU-1 \nrow['子ASIN']+\"-1\""
        },
        {
            "stepIndex": 2,
            "colName": "父SKU",
            "code": "row[\"父ASIN\"]"
        },
        {
            "stepIndex": 3,
            "colName": "条码类型",
            "code": "\"UPC\""
        },
        {
            "stepIndex": 4,
            "colName": "价格",
            "code": "// 1. 获取售价并转为字符串\nconst rawStr = String(row['售价'] || row['price'] || '').trim();\n\n// 2. 正则提取首个有效金额数字（防止被后面的 savings/数字干扰）\nconst match = rawStr.match(/(\\d+(?:\\.\\d+)?)/);\nconst price = match ? parseFloat(match[1]) : 0;\n\nif (price <= 0) return 0;\n\n// 3. 业务规则：统一加 35% (* 1.35)\nconst finalPrice = price * 1.35;\n\n// 4. 固定以 9 结尾（先保留两位小数，再将最后一位强制替换为 9，如 50.00 -> 50.09）\nconst resultWith9 = finalPrice.toFixed(2).replace(/\\d$/, '9');\n\nreturn Number(resultWith9);"
        },
        {
            "stepIndex": 5,
            "colName": "品牌名",
            "code": "// 如果你有品牌的话，下面可以填写你自己的品牌名\n\"Unbranded\""
        },
        {
            "stepIndex": 6,
            "colName": "\"发货中心\"",
            "code": "// 下面这个引号里面可以填上你自己的物流中心\n\"填写你的发货中心ID\""
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
