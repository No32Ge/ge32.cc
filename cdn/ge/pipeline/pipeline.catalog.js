/**
 * 全局数据管线方案索引清单 (Catalog)
 * 说明：此文件只做目录索引，不包含具体逻辑，系统仅在用户点击时按需下载对应方案。
 */
(function(global) {
    'use strict';

    const catalogList = [
        {
            // 方案的唯一英文标识 (建议与文件名后缀保持一致)
            id: 'Ksold_SKUDone',

            // 在系统下拉列表里显示的名称 (可自定义更清晰的业务中文名)
            name: '📦 Ksold SKU 规整与处理方案',

            // 该原子插件的真实网络链接 (点击激活时才会动态拉取)
            url: 'https://www.ge32.cc/cdn/ge/pipeline/pipeline.preset.Ksold_SKUDone.js'
        }
    ];

    // 1. 优先挂载到标准全局变量
    global.__PIPELINE_CATALOG__ = catalogList;

    // 2. 兼容如果引擎已提前初始化时的直接注册
    if (global.__EXCEL_PIPELINE_ENGINE__ && global.__EXCEL_PIPELINE_ENGINE__.hub) {
        global.__EXCEL_PIPELINE_ENGINE__.hub.registerCatalog(catalogList);
    }
})(typeof window !== 'undefined' ? window : this);