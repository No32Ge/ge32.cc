
// ============== 主入口：初始化一切 ==============
(function() {
    window.initEditors();
    window.loadDedupFieldsToUI();
    window.bindEvents();

    window.initCollapse(
        window.mappingToggleHeader,
        window.mappingToggleIcon,
        window.mappingCollapseWrapper,
        'expanded-content-mapping',
        window.LK_MAPPING_COLLAPSED
    );
    window.initCollapse(
        window.colorEnumToggleHeader,
        window.colorEnumToggleIcon,
        window.colorEnumCollapseWrapper,
        'expanded-content-color-enum',
        window.LK_COLOR_COLLAPSED
    );
    window.initCollapse(
        window.codeToggleHeader,
        window.codeToggleIcon,
        window.codeCollapseWrapper,
        'expanded-content',
        window.LK_CODE_COLLAPSED
    );

    window.lastDedupColName = window.lsGet('last_dedup_col_name', '');
    window.renderConfigList();
    window.applyDefaultConfigOnStartup();
    window.updateDedupDatalist();
    window.updateDedupFieldHints();
    window.updateDedupReadyStatus();

    // 初始化价格计算器
    window.initPriceCalculator();

    window.log('🚀 系统就绪，上传Excel后依次执行“处理”、“颜色去重”、“价格计算”、“计数解析”，最后导出');
})();
