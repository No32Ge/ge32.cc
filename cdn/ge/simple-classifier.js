(function(global) {
    'use strict';

    // 1. 定义你的唯一命名空间标识
    const IDENTIFIER = '__CUSTOM_ENUM_CLASSIFIER_TOOL__';

    // 防止重复注入/重定义检查
    if (Object.prototype.hasOwnProperty.call(global, IDENTIFIER)) {
        console.warn(`[WARN] ${IDENTIFIER} 已存在于全局环境，跳过重复定义。`);
        return;
    }

    /**
     * 纯粹通用分类器工厂
     * @param {Object} enumConfig - 字典配置映射表
     * @param {Object} [options] - 配置项
     */
    function create(enumConfig, options = {}) {
        const {
            defaultValue = null,
            caseSensitive = false,
            trim = true
        } = options;

        const exactMap = new Map();

        if (enumConfig && typeof enumConfig === 'object') {
            for (const [targetCategory, aliases] of Object.entries(enumConfig)) {
                if (Array.isArray(aliases)) {
                    aliases.forEach(alias => {
                        let key = String(alias);
                        if (trim) key = key.trim();
                        if (!caseSensitive) key = key.toLowerCase();
                        if (key) exactMap.set(key, targetCategory);
                    });
                }
            }
        }

        // 核心分类执行函数：传什么数据，直接返还分类结果；未命中则返回 defaultValue
        function classify(input, overrideDefault) {
            const fallback = overrideDefault !== undefined ? overrideDefault : defaultValue;
            if (input === null || input === undefined || input === '') {
                return fallback;
            }

            let key = String(input);
            if (trim) key = key.trim();
            if (!caseSensitive) key = key.toLowerCase();

            return exactMap.has(key) ? exactMap.get(key) : fallback;
        }

        // 冻结实例，防止外部篡改分类器内部方法
        return Object.freeze({
            classify,
            classifyList: (list) => Array.isArray(list) ? list.map(item => classify(item)) : []
        });
    }

    const toolInstance = Object.freeze({
        create,
        version: '1.0.0'
    });

    // 2. 挂载到 window，并锁定描述符（不可修改、不可枚举遍历、不可删除）
    Object.defineProperty(global, IDENTIFIER, {
        value: toolInstance,
        writable: false,      // 阻止被 global[IDENTIFIER] = xxx 覆盖
        configurable: false,  // 阻止被 delete global[IDENTIFIER] 删除
        enumerable: false     // 阻止在 for...in 或 Object.keys(window) 中被遍历出来
    });

})(typeof window !== 'undefined' ? window : globalThis);