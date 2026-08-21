
// ============== 全局状态与 DOM 引用（挂载到 window） ==============
(function() {
    // 数据状态
    window.workbook = null;
    window.currentSheetName = '';
    window.rawDataRows = [];
    window.allColumns = [];
    window.processedData = [];

    // 编辑器实例
    window.codeEditor = null;
    window.mappingEditor = null;
    window.colorEnumEditor = null;

    // 上次去重添加的列名
    window.lastDedupColName = '';

    // 当前配置
    window.currentConfig = {
        name: '默认方案',
        isDefault: false,
        mapping: window.DEFAULT_MAPPING,
        code: window.DEFAULT_CODE,
        colorEnum: JSON.stringify(window.DEFAULT_COLOR_ENUM, null, 2),
        skuColumn: '',
        parentSkuColumn: ''
    };

    // DOM 元素引用（body 底部加载，此时 DOM 已存在）
    const $ = window.$;
    window.fileInput = $('fileInput');
    window.sheetSelect = $('sheetSelect');
    window.loadSheetBtn = $('loadSheetBtn');
    window.skuColSelect = $('skuColSelect');
    window.parentColSelect = $('parentColSelect');
    window.mappingContainer = $('mappingEditorContainer');
    window.codeContainer = $('codeEditorContainer');
    window.colorEnumContainer = $('colorEnumEditorContainer');
    window.mappingCard = $('mappingCard');
    window.codeCard = $('codeCard');
    window.colorEnumCard = $('colorEnumCard');
    window.mappingToggleHeader = $('mappingToggleHeader');
    window.mappingToggleIcon = $('mappingToggleIcon');
    window.mappingCollapseWrapper = $('mappingCollapseWrapper');
    window.mappingFullscreenBtn = $('mappingFullscreenBtn');
    window.colorEnumToggleHeader = $('colorEnumToggleHeader');
    window.colorEnumToggleIcon = $('colorEnumToggleIcon');
    window.colorEnumCollapseWrapper = $('colorEnumCollapseWrapper');
    window.colorEnumFullscreenBtn = $('colorEnumFullscreenBtn');
    window.codeToggleHeader = $('codeToggleHeader');
    window.codeToggleIcon = $('codeToggleIcon');
    window.codeCollapseWrapper = $('codeCollapseWrapper');
    window.codeFullscreenBtn = $('codeFullscreenBtn');
    window.runProcessBtn = $('runProcessBtn');
    window.exportBtn = $('exportResultBtn');
    window.exportFullCheck = $('exportFullCheckbox');
    window.exportNewCheck = $('exportNewColsCheckbox');
    window.dataStatus = $('dataStatus');
    window.logArea = $('logArea');
    window.saveConfigBtn = $('saveConfigBtn');
    window.exportConfigBtn = $('exportConfigBtn');
    window.importConfigFile = $('importConfigFile');
    window.resetMappingBtn = $('resetMappingBtn');
    window.resetCodeBtn = $('resetCodeBtn');
    window.resetColorEnumBtn = $('resetColorEnumBtn');
    window.configListContainer = $('configListContainer');
    window.colorUnmappedMini = $('colorUnmappedMini');

    // 数据去重相关 DOM
    window.dedupToggleHeader = $('dedupToggleHeader');
    window.dedupToggleIcon = $('dedupToggleIcon');
    window.dedupCollapseWrapper = $('dedupCollapseWrapper');
    window.dedupInputField = $('dedupInputField');
    window.dedupGroupField = $('dedupGroupField');
    window.dedupOutputField = $('dedupOutputField');
    window.dedupMode = $('dedupMode');
    window.dedupColumnsList = $('dedupColumnsList');
    window.dedupRunBtn = $('dedupRunBtn');
    window.dedupStatsArea = $('dedupStatsArea');
    window.dedupResetFieldsBtn = $('dedupResetFieldsBtn');
    window.dedupReadyBadge = $('dedupReadyBadge');
    window.dedupReadyDot = $('dedupReadyDot');
    window.dedupReadyText = $('dedupReadyText');
    window.dedupInputHint = $('dedupInputHint');
    window.dedupGroupHint = $('dedupGroupHint');
    window.dedupOutputHint = $('dedupOutputHint');

    // 价格计算器 DOM
    window.priceCard = $('priceCard');
    window.priceToggleHeader = $('priceToggleHeader');
    window.priceToggleIcon = $('priceToggleIcon');
    window.priceCollapseWrapper = $('priceCollapseWrapper');
    window.priceFullscreenBtn = $('priceFullscreenBtn');
    window.priceRunBtn = $('priceRunBtn');
    window.priceResetFormulaBtn = $('priceResetFormulaBtn');
    window.priceResetFieldsBtn = $('priceResetFieldsBtn');
    window.priceSkuColSelect = $('priceSkuColSelect');
    window.priceWeightColSelect = $('priceWeightColSelect');
    window.priceVolWeightColSelect = $('priceVolWeightColSelect');
    window.priceRateInput = $('priceRateInput');
    window.priceFormulaContainer = $('priceFormulaContainer');
    window.priceStatsArea = $('priceStatsArea');


    // 标签页
    window.tabMainBtn = $('tabMainBtn');
    window.tabFilterBtn = $('tabFilterBtn');
    window.tabConfigBtn = $('tabConfigBtn');
    window.mainPage = $('mainPage');
    window.filterPage = $('filterPage');
    window.configPage = $('configPage');

    // 筛选器 DOM
    window.filterConditionsContainer = $('filterConditionsContainer');
    window.filterAddConditionBtn = $('filterAddConditionBtn');
    window.filterRunBtn = $('filterRunBtn');
    window.filterCopyBtn = $('filterCopyBtn');
    window.filterSelectAllBtn = $('filterSelectAllBtn');
    window.filterDeleteBtn = $('filterDeleteBtn');
    window.filterResultContainer = $('filterResultContainer');
    window.filterResultCount = $('filterResultCount');
    window.filterConfigNameInput = $('filterConfigNameInput');
    window.filterSaveConfigBtn = $('filterSaveConfigBtn');
    window.filterConfigListContainer = $('filterConfigListContainer');

    // 主页快捷按钮
    window.quickPriceBtn = $('quickPriceBtn');
    window.quickDedupBtn = $('quickDedupBtn');

    window.quickFixBtn = $('quickFixBtn');
    window.colorFixBtn = $('colorFixBtn');

    // 枚举归类 DOM
    window.classifySourceCol = $('classifySourceCol');
    window.classifyOutputCol = $('classifyOutputCol');
    window.classifyRunBtn = $('classifyRunBtn');
})();
