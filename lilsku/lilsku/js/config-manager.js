
// ============== 配置方案管理 ==============
(function() {
    const { $, esc, lsGet, lsSet, log } = window;

    function loadConfigs() {
        return lsGet(window.LK_CONFIGS, []);
    }

    function saveConfigs(configs) {
        // 确保最多只有一个默认方案，保留第一个 isDefault 为 true 的，其余设为 false
        let foundDefault = false;
        configs.forEach(c => {
            if (c.isDefault) {
                if (foundDefault) c.isDefault = false;
                else foundDefault = true;
            }
        });
        lsSet(window.LK_CONFIGS, configs);
        renderConfigList();
    }

    function getCurrentFullConfig() {
        return {
            name: window.currentConfig.name || '未命名',
            isDefault: window.currentConfig.isDefault || false,
            skuColumn: window.skuColSelect.value,
            parentSkuColumn: window.parentColSelect.value,
            mapping: window.mappingEditor ? window.mappingEditor.getValue() : window.currentConfig.mapping,
            code: window.codeEditor ? window.codeEditor.getValue() : window.currentConfig.code,
            colorEnum: window.colorEnumEditor ? window.colorEnumEditor.getValue() : window.currentConfig.colorEnum,
            classifySourceCol: window.classifySourceCol ? window.classifySourceCol.value.trim() : '',
            classifyOutputCol: window.classifyOutputCol ? window.classifyOutputCol.value.trim() : 'Color Classification',
            dedupFields: {
                inputField: window.dedupInputField ? window.dedupInputField.value.trim() : '',
                groupField: window.dedupGroupField ? window.dedupGroupField.value.trim() : '',
                outputField: window.dedupOutputField ? window.dedupOutputField.value.trim() : '',
                mode: window.dedupMode ? window.dedupMode.value : 'letter'
            },
            priceFields: {
                exchangeRate: window.priceRateInput ? window.priceRateInput.value : '7.2',
                skuPriceCol: window.priceSkuColSelect ? window.priceSkuColSelect.value : '',
                weightCol: window.priceWeightColSelect ? window.priceWeightColSelect.value : '',
                volWeightCol: window.priceVolWeightColSelect ? window.priceVolWeightColSelect.value : ''
            },
            priceFormula: window.priceFormulaEditor ? window.priceFormulaEditor.getValue() : '',
        };
    }

    function applyConfig(cfg) {
        if (cfg.skuColumn) window.skuColSelect.value = cfg.skuColumn;
        if (cfg.parentSkuColumn) window.parentColSelect.value = cfg.parentSkuColumn;
        if (window.mappingEditor && cfg.mapping !== undefined) window.mappingEditor.setValue(cfg.mapping);
        if (window.codeEditor && cfg.code !== undefined) window.codeEditor.setValue(cfg.code);
        if (window.colorEnumEditor && cfg.colorEnum !== undefined) {
            window.colorEnumEditor.setValue(cfg.colorEnum);
            window.saveColorEnumFromEditor();
        }
        if (cfg.classifySourceCol !== undefined && window.classifySourceCol) window.classifySourceCol.value = cfg.classifySourceCol || '';
        if (cfg.classifyOutputCol !== undefined && window.classifyOutputCol) window.classifyOutputCol.value = cfg.classifyOutputCol || 'Color Classification';
        if (cfg.dedupFields) {
            if (window.dedupInputField) window.dedupInputField.value = cfg.dedupFields.inputField || '';
            if (window.dedupGroupField) window.dedupGroupField.value = cfg.dedupFields.groupField || '';
            if (window.dedupOutputField) window.dedupOutputField.value = cfg.dedupFields.outputField || '去重后值';
            if (window.dedupMode) window.dedupMode.value = cfg.dedupFields.mode || 'letter';
            window.saveDedupFields();
        }
        if (cfg.priceFields) {
            if (window.priceRateInput) window.priceRateInput.value = cfg.priceFields.exchangeRate || '7.2';
            if (window.priceSkuColSelect) window.priceSkuColSelect.value = cfg.priceFields.skuPriceCol || '';
            if (window.priceWeightColSelect) window.priceWeightColSelect.value = cfg.priceFields.weightCol || '';
            if (window.priceVolWeightColSelect) window.priceVolWeightColSelect.value = cfg.priceFields.volWeightCol || '';
            window.savePriceFields && window.savePriceFields();
        }
        if (cfg.priceFormula !== undefined && window.priceFormulaEditor) {
            window.priceFormulaEditor.setValue(cfg.priceFormula);
            window.lsSet && window.lsSet('ge32_formula_code', cfg.priceFormula);
        }

        window.currentConfig.name = cfg.name || '未命名';
        window.currentConfig.isDefault = !!cfg.isDefault;
        window.updateDedupDatalist();
        window.updateDedupFieldHints();
        window.updateDedupReadyStatus();
    }

    function setDefaultConfig(index) {
        const configs = loadConfigs();
        configs.forEach((c, i) => c.isDefault = (i === index));
        saveConfigs(configs);
    }

    function renderConfigList() {
        const configs = loadConfigs();
        if (!configs.length) {
            window.configListContainer.innerHTML = '<span class="text-gray-500 text-sm">暂无方案</span>';
            return;
        }
        window.configListContainer.innerHTML = configs.map((c, i) => `
            <div class="config-item" data-index="${i}">
                <label class="checkbox-white config-default-check">
                    <input type="checkbox" class="config-default-radio" ${c.isDefault ? 'checked' : ''}>
                    <span>默认</span>
                </label>
                <span>📋 ${esc(c.name)}</span>
                <button class="text-blue-400 hover:text-blue-300 config-apply-btn" data-apply="${i}">应用</button>
                <button class="text-red-400 hover:text-red-300 config-delete-btn" data-delete="${i}">删除</button>
            </div>`).join('');
        
        // 默认勾选互斥处理
        window.configListContainer.querySelectorAll('.config-default-radio').forEach(radio => {
            radio.addEventListener('change', function(e) {
                if (this.checked) {
                    const idx = parseInt(this.closest('.config-item').dataset.index, 10);
                    setDefaultConfig(idx);
                } else {
                    // 不允许取消勾选，保持原状
                    const cfgs = loadConfigs();
                    const idx = parseInt(this.closest('.config-item').dataset.index, 10);
                    if (cfgs[idx]) {
                        this.checked = cfgs[idx].isDefault;
                    }
                }
            });
        });

        window.configListContainer.querySelectorAll('[data-apply]').forEach(b => b.addEventListener('click', e => {
            applyConfig(loadConfigs()[e.target.dataset.apply]);
            log('方案已应用', 'success');
        }));
        window.configListContainer.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', e => {
            const cfgs = loadConfigs();
            cfgs.splice(e.target.dataset.delete, 1);
            saveConfigs(cfgs);
        }));
    }

    function applyDefaultConfigOnStartup() {
        const configs = loadConfigs();
        const defaultCfg = configs.find(c => c.isDefault);
        if (defaultCfg) {
            applyConfig(defaultCfg);
            log(`📌 已自动应用默认方案: ${defaultCfg.name}`, 'info');
        }
    }

    window.loadConfigs = loadConfigs;
    window.saveConfigs = saveConfigs;
    window.getCurrentFullConfig = getCurrentFullConfig;
    window.applyConfig = applyConfig;
    window.renderConfigList = renderConfigList;
    window.applyDefaultConfigOnStartup = applyDefaultConfigOnStartup;
})();
