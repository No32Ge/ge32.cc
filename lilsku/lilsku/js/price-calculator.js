
// ============== 价格计算器（挂载到 window） ==============
(function() {
    const { $, esc, lsGet, lsSet, log } = window;

    // ───────── 常量 ─────────
    const LK_RATE = 'ge32_exchange_rate';
    const LK_FORMULA = 'ge32_formula_code';
    const LK_FORMULA_COLLAPSED = 'ge32_formula_collapsed';
    const LK_PRICE_FIELDS = 'ge32_price_fields';
    const LK_LAST_PRICE_COLS = 'last_price_cols';

    const DEFAULT_RATE = 7.2;

    const DEFAULT_FORMULA = [
        'function compute(row, shippingRates, exchangeRate) {',
        '    // ========== 利润率配置（可按需修改） ==========',
        '    const PROFIT_FACTOR_LOW  = 0.5;',
        '    const PROFIT_FACTOR_MID  = 0.52;',
        '    const PROFIT_FACTOR_HIGH = 0.65;',
        '',
        '    function getWeightBucket(w) {',
        '        return Math.round((w + 4.99) / 10) * 10;',
        '    }',
        '',
        '    function getShippingCost(w) {',
        '        const bucket = getWeightBucket(w);',
        '        return shippingRates.get(bucket) ?? 999;',
        '    }',
        '',
        '    const weight = parseFloat(row.weight) || 0;',
        '    const volWeight = parseFloat(row.volWeight) || 0;',
        '    const skuPrice = parseFloat(row.skuPrice) || 0;',
        '',
        '    const actualWeight = Math.max(weight, volWeight);',
        '    const shippingCNY = getShippingCost(actualWeight);',
        '    const totalCNY = skuPrice + shippingCNY;',
        '    const usdBase = totalCNY / exchangeRate;',
        '',
        '    let profitFactor = usdBase <= 5 ? PROFIT_FACTOR_LOW',
        '                     : usdBase <= 15 ? PROFIT_FACTOR_MID',
        '                     : PROFIT_FACTOR_HIGH;',
        '',
        '    const finalPrice = usdBase / profitFactor;',
        '',
        '    return {',
        '        actualWeight,',
        '        shippingCNY,',
        '        totalCNY,',
        '        finalUsdPrice: Math.round(finalPrice * 100) / 100',
        '    };',
        '}'
    ].join('\n');

    const DEFAULT_PRICE_FIELDS = {
        skuPriceCol: '',
        weightCol: '',
        volWeightCol: ''
    };

    // ───────── 内部状态 ─────────
    let shippingRates = new Map();
    let lastPriceCols = []; // 上次添加的列名数组

    // ───────── 汇率 ─────────
    function getRate() { return lsGet(LK_RATE, DEFAULT_RATE); }
    function saveRate(rate) { lsSet(LK_RATE, rate); }
    function setExchangeRate(newRate) {
        const rate = parseFloat(newRate);
        if (isNaN(rate) || rate <= 0) {
            log('无效汇率值，请输入正数', 'error');
            return false;
        }
        saveRate(rate);
        window.priceRateInput.value = rate;
        log(`汇率已更新为: ${rate}`, 'success');
        return true;
    }
    window.setExchangeRate = setExchangeRate;

    // ───────── 运费表管理 ─────────
    function refreshShippingRates() {
        shippingRates.clear();
        const rawMap = window.map;
        if (Array.isArray(rawMap)) {
            rawMap.forEach(([weight, cost]) => shippingRates.set(Number(weight), Number(cost)));
        } else if (rawMap instanceof Map) {
            shippingRates = new Map(rawMap);
        }
        log(`运费表已刷新 (${shippingRates.size} 档位)`, 'info');
    }

    // 监听 window.map 变化
    (function setupMapWatcher() {
        let _map = window.map;
        Object.defineProperty(window, 'map', {
            get() { return _map; },
            set(value) {
                _map = value;
                refreshShippingRates();
                log('检测到 window.map 已更新，运费表自动同步', 'warning');
            },
            configurable: true
        });
    })();

    // ───────── 价格字段配置 ─────────
    function getPriceFields() {
        const saved = lsGet(LK_PRICE_FIELDS, DEFAULT_PRICE_FIELDS);
        return {
            skuPriceCol: saved.skuPriceCol || '',
            weightCol: saved.weightCol || '',
            volWeightCol: saved.volWeightCol || ''
        };
    }

    function savePriceFields() {
        lsSet(LK_PRICE_FIELDS, {
            skuPriceCol: window.priceSkuColSelect ? window.priceSkuColSelect.value : '',
            weightCol: window.priceWeightColSelect ? window.priceWeightColSelect.value : '',
            volWeightCol: window.priceVolWeightColSelect ? window.priceVolWeightColSelect.value : ''
        });
    }

    function populatePriceColumnSelects() {
        const allCols = window.getAllAvailableColumns ? window.getAllAvailableColumns() : window.allColumns;
        const updateDatalist = (listId, inputEl) => {
            const dl = document.getElementById(listId);
            if (dl) dl.innerHTML = allCols.map(c => `<option value="${esc(c)}">`).join('');
            if (inputEl) inputEl.setAttribute('list', listId);
        };
        updateDatalist('priceSkuColList', window.priceSkuColSelect);
        updateDatalist('priceWeightColList', window.priceWeightColSelect);
        updateDatalist('priceVolWeightColList', window.priceVolWeightColSelect);
    }

    function loadPriceFieldsToUI() {
        const fields = getPriceFields();
        if (window.priceSkuColSelect) window.priceSkuColSelect.value = fields.skuPriceCol;
        if (window.priceWeightColSelect) window.priceWeightColSelect.value = fields.weightCol;
        if (window.priceVolWeightColSelect) window.priceVolWeightColSelect.value = fields.volWeightCol;
    }

    // ───────── 公式编辑器 ─────────
    let priceFormulaEditor;
    function initPriceFormulaEditor() {
        if (!window.priceFormulaContainer) return;
        const saved = lsGet(LK_FORMULA, DEFAULT_FORMULA);
        priceFormulaEditor = CodeMirror(window.priceFormulaContainer, {
            value: saved,
            mode: 'javascript',
            theme: 'material-darker',
            lineNumbers: true,
            tabSize: 2
        });
        priceFormulaEditor.setSize('100%', '260px');
        priceFormulaEditor.on('change', () => {
            lsSet(LK_FORMULA, priceFormulaEditor.getValue());
        });
        window.priceFormulaEditor = priceFormulaEditor;
    }

    // ───────── 执行计算 ─────────
    function runPriceCalc() {
        const data = window.processedData;
        if (!data || !data.length) {
            log('❌ 请先执行“变体组处理”或确保有处理后的数据', 'error');
            return;
        }
        const skuPriceCol = window.priceSkuColSelect.value.trim();
        const weightCol = window.priceWeightColSelect.value.trim();
        const volWeightCol = window.priceVolWeightColSelect.value.trim();
        if (!skuPriceCol || !weightCol) {
            log('❌ 请至少选择 SKU价格列 和 重量列', 'error');
            return;
        }
        const rate = getRate();
        if (!shippingRates.size) refreshShippingRates();

        let computeFn;
        try {
            const code = priceFormulaEditor.getValue();
            computeFn = new Function('row', 'shippingRates', 'exchangeRate',
                code + '; return compute(row, shippingRates, exchangeRate);'
            );
            // 预测试
            computeFn({ skuPrice: 1, weight: 1, volWeight: 0 }, shippingRates, rate);
        } catch (err) {
            log(`❌ 公式错误: ${err.message}`, 'error');
            return;
        }

        // 清理旧价格列
        if (lastPriceCols.length) {
            lastPriceCols.forEach(col => data.forEach(row => delete row[col]));
            log(`🧹 已移除旧价格列: ${lastPriceCols.join(', ')}`, 'info');
        }

        const newColsSet = new Set();
        let ok = 0, fail = 0;
        data.forEach(row => {
            try {
                // 构造增强 row 对象，保留原始字段并注入 skuPrice/weight/volWeight
                const enhanced = { ...row };
                enhanced.skuPrice = row[skuPriceCol] ?? 0;
                enhanced.weight = row[weightCol] ?? 0;
                enhanced.volWeight = volWeightCol ? (row[volWeightCol] ?? 0) : 0;

                const result = computeFn(enhanced, shippingRates, rate);
                if (typeof result === 'object' && result !== null) {
                    Object.keys(result).forEach(k => newColsSet.add(k));
                    Object.assign(row, result);
                    ok++;
                } else {
                    fail++;
                }
            } catch (e) {
                fail++;
                log(`行计算失败: ${e.message}`, 'warning');
            }
        });

        lastPriceCols = Array.from(newColsSet);
        lsSet(LK_LAST_PRICE_COLS, lastPriceCols);
        log(`💰 价格计算完成: ${ok} 成功, ${fail} 失败，新增列: ${lastPriceCols.join(', ')}`, 'success');
        window.dataStatus.textContent = `✅ 已计价，含列: ${lastPriceCols.join(', ')}`;
        // 更新去重等面板的列提示
        if (window.updateDedupDatalist) window.updateDedupDatalist();
        if (window.updateDedupFieldHints) window.updateDedupFieldHints();
    }

    // ───────── 面板折叠与全屏 ─────────
    function initPricePanelCollapse() {
        const toggle = window.priceToggleHeader;
        const icon = window.priceToggleIcon;
        const wrapper = window.priceCollapseWrapper;
        if (!toggle || !icon || !wrapper) return;
        const saved = lsGet(LK_FORMULA_COLLAPSED, false);
        wrapper.className = saved ? 'collapsed-content' : 'expanded-content-pricing';
        icon.className = saved ? 'fa-solid fa-chevron-right text-gray-400' : 'fa-solid fa-chevron-down text-gray-400';
        toggle.addEventListener('click', () => {
            const now = wrapper.classList.contains('expanded-content-pricing');
            wrapper.className = now ? 'collapsed-content' : 'expanded-content-pricing';
            icon.className = now ? 'fa-solid fa-chevron-right text-gray-400' : 'fa-solid fa-chevron-down text-gray-400';
            lsSet(LK_FORMULA_COLLAPSED, now);
            if (priceFormulaEditor) setTimeout(() => priceFormulaEditor.refresh(), 350);
        });
    }

    function initPriceFullscreen() {
        const card = window.priceCard;
        const btn = window.priceFullscreenBtn;
        if (!card || !btn) return;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const is = card.classList.contains('fullscreen-card');
            card.classList.toggle('fullscreen-card');
            btn.innerHTML = is ? '<i class="fa-solid fa-expand"></i>' : '<i class="fa-solid fa-compress"></i>';
            if (priceFormulaEditor) {
                setTimeout(() => {
                    priceFormulaEditor.refresh();
                    priceFormulaEditor.setSize('100%', is ? 'auto' : '100%');
                }, 100);
            }
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && card.classList.contains('fullscreen-card')) {
                card.classList.remove('fullscreen-card');
                btn.innerHTML = '<i class="fa-solid fa-expand"></i>';
                if (priceFormulaEditor) {
                    setTimeout(() => priceFormulaEditor.refresh(), 100);
                }
            }
        });
    }

    function initPriceCalcEvents() {
        // 运行按钮
        if (window.priceRunBtn) {
            window.priceRunBtn.addEventListener('click', runPriceCalc);
        }
        // 重置公式
        if (window.priceResetFormulaBtn) {
            window.priceResetFormulaBtn.addEventListener('click', () => {
                if (priceFormulaEditor) {
                    priceFormulaEditor.setValue(DEFAULT_FORMULA);
                    lsSet(LK_FORMULA, DEFAULT_FORMULA);
                }
                log('价格计算公式已重置', 'info');
            });
        }
        // 重置字段
        if (window.priceResetFieldsBtn) {
            window.priceResetFieldsBtn.addEventListener('click', () => {
                const defaults = DEFAULT_PRICE_FIELDS;
                if (window.priceSkuColSelect) window.priceSkuColSelect.value = defaults.skuPriceCol;
                if (window.priceWeightColSelect) window.priceWeightColSelect.value = defaults.weightCol;
                if (window.priceVolWeightColSelect) window.priceVolWeightColSelect.value = defaults.volWeightCol;
                savePriceFields();
                log('价格字段已重置', 'info');
            });
        }
        // 列选择变化时保存
        [window.priceSkuColSelect, window.priceWeightColSelect, window.priceVolWeightColSelect].forEach(el => {
            if (el) el.addEventListener('change', savePriceFields);
        });
        // 汇率修改
        if (window.priceRateInput) {
            window.priceRateInput.addEventListener('change', () => {
                setExchangeRate(window.priceRateInput.value);
            });
        }
    }

    // ───────── 初始化入口 ─────────
    function initPriceCalculator() {
        // 恢复汇率
        if (window.priceRateInput) {
            window.priceRateInput.value = getRate();
        }
        loadPriceFieldsToUI();
        populatePriceColumnSelects();
        initPriceFormulaEditor();
        initPricePanelCollapse();
        initPriceFullscreen();
        initPriceCalcEvents();
        refreshShippingRates();

        // 恢复上次价格列名
        lastPriceCols = lsGet(LK_LAST_PRICE_COLS, []);
        if (lastPriceCols.length) {
            log(`📌 检测到上次价格列: ${lastPriceCols.join(', ')} (将在新计算时覆盖)`, 'info');
        }
    }

    window.initPriceCalculator = initPriceCalculator;
    window.runPriceCalc = runPriceCalc;
    window.populatePriceColumnSelects = populatePriceColumnSelects;
})();
