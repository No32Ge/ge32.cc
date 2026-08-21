
// ============== SKU 筛选器（复用 rawDataRows，支持条件组、删除） ==============
(function() {
    const { $, esc, lsGet, lsSet, log } = window;

    const LK_FILTER_CONFIGS = 'sku_filter_configs_v4';
    const LK_FILTER_CONDITIONS = 'sku_filter_conditions';

    // ─────────── 内部状态 ───────────
    let conditionGroups = [];
    let filteredSKUs = [];
    // 缓存原始表引用，直接操作 window.rawDataRows

    // ─────────── 默认条件 ───────────
    const DEFAULT_CONDITIONS = [
        { column: '', matchType: 'include', keywords: [] },
        { column: '', matchType: 'gt', numericValue: 30, keywords: [] }
    ];

    // ─────────── 条件管理 ───────────
    function loadConditions() {
        const saved = lsGet(LK_FILTER_CONDITIONS, null);
        if (saved && Array.isArray(saved)) {
            conditionGroups = saved.map(g => ({ ...g, keywords: [...(g.keywords || [])] }));
        } else {
            conditionGroups = DEFAULT_CONDITIONS.map(g => ({ ...g, keywords: [...(g.keywords || [])] }));
        }
    }

    function saveConditions() {
        lsSet(LK_FILTER_CONDITIONS, conditionGroups);
    }

    function renderConditionsUI() {
        const container = window.filterConditionsContainer;
        if (!container) return;
        if (!conditionGroups.length) {
            container.innerHTML = '<div class="text-sm text-gray-400 text-center py-4">暂无筛选条件，点击下方按钮添加</div>';
            return;
        }
        const allCols = window.allColumns.length ? window.allColumns : (window.processedData.length ? Object.keys(window.processedData[0]).filter(k => !k.startsWith('_')) : []);
        const colOptions = allCols.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');

        container.innerHTML = conditionGroups.map((group, idx) => {
            const mt = group.matchType || 'include';
            const isNumeric = ['gt','lt','eq','gte','lte'].includes(mt);
            const isExists = ['exists','notExists'].includes(mt);
            const keywordsText = (group.keywords || []).join('\n');
            const numericVal = group.numericValue !== undefined ? group.numericValue : '';
            return `
                <div class="filter-condition-card" data-idx="${idx}">
                    <div class="flex flex-wrap items-end gap-2 mb-2">
                        <div class="flex-1 min-w-[120px]">
                            <label class="field-label">列</label>
                            <select class="input-white-sm filter-col-sel" data-idx="${idx}">
                                <option value="">-- 选择 --</option>${colOptions.replace(new RegExp(`value="${esc(group.column)}"`), `value="${esc(group.column)}" selected`)}
                            </select>
                        </div>
                        <div class="flex-1 min-w-[120px]">
                            <label class="field-label">匹配方式</label>
                            <select class="input-white-sm filter-match-sel" data-idx="${idx}">
                                <option value="include" ${mt==='include'?'selected':''}>包含关键词</option>
                                <option value="exclude" ${mt==='exclude'?'selected':''}>不包含关键词</option>
                                <option value="exists" ${mt==='exists'?'selected':''}>存在(非空)</option>
                                <option value="notExists" ${mt==='notExists'?'selected':''}>不存在(空)</option>
                                <option value="gt" ${mt==='gt'?'selected':''}>大于</option>
                                <option value="lt" ${mt==='lt'?'selected':''}>小于</option>
                                <option value="eq" ${mt==='eq'?'selected':''}>等于</option>
                                <option value="gte" ${mt==='gte'?'selected':''}>≥</option>
                                <option value="lte" ${mt==='lte'?'selected':''}>≤</option>
                            </select>
                        </div>
                        <button class="btn-white-sm filter-remove-btn" data-idx="${idx}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                    <div class="mb-2">
                        ${isNumeric ? `
                            <label class="field-label">比较数值 (支持 %)</label>
                            <input type="text" class="input-white-sm filter-numeric-inp" data-idx="${idx}" value="${esc(String(numericVal))}" placeholder="如 100 或 30%">
                        ` : (isExists ? `
                            <div class="text-xs text-gray-400">无需额外输入</div>
                        ` : `
                            <label class="field-label">关键词 (每行一个)</label>
                            <textarea class="input-white-sm filter-keywords-ta" data-idx="${idx}" rows="2" placeholder="学生&#10;儿童">${esc(keywordsText)}</textarea>
                        `)}
                    </div>
                </div>`;
        }).join('');

        // 绑定事件
        container.querySelectorAll('.filter-col-sel').forEach(sel => sel.addEventListener('change', function(e) {
            const idx = this.dataset.idx; if (conditionGroups[idx]) conditionGroups[idx].column = this.value; saveConditions();
        }));
        container.querySelectorAll('.filter-match-sel').forEach(sel => sel.addEventListener('change', function(e) {
            const idx = this.dataset.idx; if (conditionGroups[idx]) { conditionGroups[idx].matchType = this.value; saveConditions(); renderConditionsUI(); }
        }));
        container.querySelectorAll('.filter-keywords-ta').forEach(ta => ta.addEventListener('change', function(e) {
            const idx = this.dataset.idx;
            if (conditionGroups[idx]) {
                conditionGroups[idx].keywords = parseKeywords(this.value);
                saveConditions();
            }
        }));
        container.querySelectorAll('.filter-numeric-inp').forEach(inp => inp.addEventListener('change', function(e) {
            const idx = this.dataset.idx;
            if (conditionGroups[idx]) {
                const val = parseNumericInput(this.value);
                conditionGroups[idx].numericValue = isNaN(val) ? null : val;
                saveConditions();
            }
        }));
        container.querySelectorAll('.filter-remove-btn').forEach(btn => btn.addEventListener('click', function(e) {
            const idx = this.dataset.idx;
            conditionGroups.splice(idx, 1);
            saveConditions();
            renderConditionsUI();
        }));
    }

    function parseKeywords(text) {
        if (!text) return [];
        const lines = text.split(/\r?\n/);
        const kw = [];
        lines.forEach(line => {
            if (line.includes(',')) {
                line.split(',').forEach(p => { const w = p.trim(); if (w) kw.push(w); });
            } else {
                const w = line.trim(); if (w) kw.push(w);
            }
        });
        return [...new Set(kw)];
    }

    function parseNumericInput(val) {
        if (val === null || val === undefined) return NaN;
        let str = String(val).trim();
        if (str === '') return NaN;
        if (str.endsWith('%')) {
            let num = parseFloat(str.slice(0, -1));
            return isNaN(num) ? NaN : num / 100;
        }
        return parseFloat(str);
    }

    // ─────────── 判断逻辑 ───────────
    function extractNumber(cellValue) {
        if (cellValue === undefined || cellValue === null) return NaN;
        let str = String(cellValue).trim();
        if (str === '') return NaN;
        str = str.replace(/,/g, '');
        if (str.endsWith('%')) {
            let num = parseFloat(str.slice(0, -1));
            return isNaN(num) ? NaN : num / 100;
        }
        return parseFloat(str);
    }

    function isRowHit(row, cond) {
        const col = cond.column;
        if (!col) return false;
        const cell = row[col];
        const mt = cond.matchType || 'include';

        if (mt === 'exists') return cell !== undefined && cell !== null && String(cell).trim() !== '';
        if (mt === 'notExists') return cell === undefined || cell === null || String(cell).trim() === '';

        if (['gt','lt','eq','gte','lte'].includes(mt)) {
            const cellNum = extractNumber(cell);
            if (isNaN(cellNum)) return false;
            const compVal = cond.numericValue;
            if (compVal === null || isNaN(compVal)) return false;
            switch(mt) {
                case 'gt': return cellNum > compVal;
                case 'lt': return cellNum < compVal;
                case 'eq': return Math.abs(cellNum - compVal) < 1e-12;
                case 'gte': return cellNum >= compVal;
                case 'lte': return cellNum <= compVal;
            }
            return false;
        }

        // 文本包含/不包含
        if (cell === undefined || cell === null) return false;
        const str = String(cell).toLowerCase();
        const keywords = cond.keywords || [];
        if (keywords.length === 0) return false;
        if (mt === 'include') return keywords.some(kw => str.includes(kw.toLowerCase()));
        if (mt === 'exclude') return !keywords.some(kw => str.includes(kw.toLowerCase()));
        return false;
    }

    // ─────────── 执行筛选 ───────────
    function runFilter() {
        const skuCol = window.skuColSelect.value.trim();
        const parentCol = window.parentColSelect.value.trim();
        if (!skuCol || !parentCol) {
            log('❌ 请先在主页设置 SKU列 和 父SKU列', 'error');
            return;
        }
        if (!window.rawDataRows.length) {
            log('❌ 请先上传Excel并加载数据', 'error');
            return;
        }
        const active = conditionGroups.filter(c => c.column && (
            ['exists','notExists'].includes(c.matchType) ||
            (['include','exclude'].includes(c.matchType) && (c.keywords||[]).length) ||
            (['gt','lt','eq','gte','lte'].includes(c.matchType) && !isNaN(c.numericValue))
        ));
        if (!active.length) {
            log('❌ 至少配置一个有效条件', 'error');
            return;
        }

        const hitRows = window.rawDataRows.filter(r => active.some(cond => isRowHit(r, cond)));
        if (!hitRows.length) {
            filteredSKUs = [];
            renderFilterResult([]);
            log('🔍 筛选完成，无命中数据', 'info');
            return;
        }
        // 按父SKU分组，获取组内所有SKU
        const groups = new Set();
        hitRows.forEach(r => {
            let sku = r[skuCol] ? String(r[skuCol]).trim() : '';
            let parent = r[parentCol] ? String(r[parentCol]).trim() : '';
            if (sku) groups.add(parent || sku);
        });
        const groupMap = new Map();
        window.rawDataRows.forEach(r => {
            let sku = r[skuCol] ? String(r[skuCol]).trim() : '';
            let parent = r[parentCol] ? String(r[parentCol]).trim() : '';
            if (!sku) return;
            let key = parent || sku;
            if (!groupMap.has(key)) groupMap.set(key, new Set());
            groupMap.get(key).add(sku);
        });
        const resultSet = new Set();
        groups.forEach(g => { const s = groupMap.get(g); if (s) s.forEach(v => resultSet.add(v)); });
        filteredSKUs = Array.from(resultSet);
        renderFilterResult(filteredSKUs);
        log(`🔍 筛选完成：命中 ${hitRows.length} 行，得到 ${filteredSKUs.length} 个独立SKU`, 'success');
    }

    function renderFilterResult(skuList) {
        const container = window.filterResultContainer;
        if (!container) return;
        if (!skuList.length) {
            container.innerHTML = '<div class="text-sm text-gray-400 p-4">暂无结果</div>';
            window.filterResultCount.innerText = '0 个SKU';
            return;
        }
        window.filterResultCount.innerText = `${skuList.length} 个SKU`;
        container.innerHTML = skuList.map(sku => `
            <label class="filter-sku-chip">
                <input type="checkbox" class="filter-sku-check" value="${esc(sku)}">
                <span>${esc(sku)}</span>
            </label>
        `).join('');
    }

    function getSelectedSKUs() {
        const checks = document.querySelectorAll('.filter-sku-check:checked');
        return Array.from(checks).map(cb => cb.value);
    }

    // ─────────── 删除选中SKU行 ───────────
    function deleteSelectedSKUs() {
        const skuCol = window.skuColSelect.value.trim();
        if (!skuCol) { log('❌ 未设置SKU列', 'error'); return; }
        const selected = getSelectedSKUs();
        if (!selected.length) { log('请勾选要删除的SKU', 'warning'); return; }
        const selectedSet = new Set(selected);
        const before = window.rawDataRows.length;
        window.rawDataRows = window.rawDataRows.filter(r => !selectedSet.has(String(r[skuCol] || '').trim()));
        const deleted = before - window.rawDataRows.length;
        // 清除处理结果
        window.processedData = [];
        log(`🗑️ 已删除 ${deleted} 行，剩余 ${window.rawDataRows.length} 行`, 'success');
        window.dataStatus.textContent = `✅ 数据已更新 (${window.rawDataRows.length} 行)`;
        // 重新筛选
        runFilter();
        // 刷新主页列提示等（如果有必要）
        if (window.updateDedupDatalist) window.updateDedupDatalist();
        if (window.updateDedupFieldHints) window.updateDedupFieldHints();
    }

    // ─────────── 复制SKU ───────────
    async function copyFilteredSKUs() {
        if (!filteredSKUs.length) { log('无筛选结果', 'warning'); return; }
        const text = filteredSKUs.join('\n');
        try {
            await navigator.clipboard.writeText(text);
            log(`📋 已复制 ${filteredSKUs.length} 个SKU`, 'success');
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    }

    // ─────────── 配置方案管理 (条件组快照) ───────────
    function loadConfigs() {
        return lsGet(LK_FILTER_CONFIGS, []);
    }
    function saveConfigsToStorage(configs) {
        lsSet(LK_FILTER_CONFIGS, configs);
        renderConfigList();
    }
    function getCurrentFilterConfig() {
        return {
            conditions: conditionGroups.map(g => ({ ...g, keywords: [...(g.keywords||[])] }))
        };
    }
    function applyFilterConfig(cfg) {
        if (cfg.conditions) {
            conditionGroups = cfg.conditions.map(g => ({ ...g, keywords: [...(g.keywords||[])] }));
            saveConditions();
            renderConditionsUI();
            log('筛选条件已应用', 'success');
        }
    }
    function renderConfigList() {
        const container = window.filterConfigListContainer;
        if (!container) return;
        const configs = loadConfigs();
        if (!configs.length) {
            container.innerHTML = '<span class="text-sm text-gray-400">暂无保存</span>';
            return;
        }
        container.innerHTML = configs.map((cfg, i) => `
            <div class="config-item" style="margin-bottom:0.3rem;">
                <span class="text-sm">📋 ${esc(cfg.name)}</span>
                <button class="btn-white-sm filter-apply-config" data-idx="${i}">应用</button>
                <button class="btn-white-sm filter-delete-config" data-idx="${i}"><i class="fa-solid fa-trash"></i></button>
            </div>
        `).join('');
        container.querySelectorAll('.filter-apply-config').forEach(b => b.addEventListener('click', e => {
            const cfgs = loadConfigs();
            applyFilterConfig(cfgs[e.target.dataset.idx].config);
        }));
        container.querySelectorAll('.filter-delete-config').forEach(b => b.addEventListener('click', e => {
            const cfgs = loadConfigs();
            cfgs.splice(e.target.dataset.idx, 1);
            saveConfigsToStorage(cfgs);
        }));
    }

    function saveCurrentFilterConfig() {
        const nameInput = window.filterConfigNameInput;
        if (!nameInput) return;
        const name = nameInput.value.trim();
        if (!name) { log('请输入配置名称', 'warning'); return; }
        const configs = loadConfigs();
        configs.push({ name, config: getCurrentFilterConfig() });
        saveConfigsToStorage(configs);
        nameInput.value = '';
        log(`筛选配置“${name}”已保存`, 'success');
    }

    // ─────────── 初始化 ───────────
    function initFilterPage() {
        loadConditions();
        renderConditionsUI();
        renderConfigList();
        initFilterConfigCollapse();

        // 事件绑定
        if (window.filterAddConditionBtn) {
            window.filterAddConditionBtn.addEventListener('click', () => {
                conditionGroups.unshift({ column: '', matchType: 'include', keywords: [] });
                saveConditions();
                renderConditionsUI();
            });
        }
        if (window.filterRunBtn) {
            window.filterRunBtn.addEventListener('click', runFilter);
        }
        if (window.filterCopyBtn) {
            window.filterCopyBtn.addEventListener('click', copyFilteredSKUs);
        }
        if (window.filterDeleteBtn) {
            window.filterDeleteBtn.addEventListener('click', deleteSelectedSKUs);
        }
        if (window.filterSaveConfigBtn) {
            window.filterSaveConfigBtn.addEventListener('click', saveCurrentFilterConfig);
        }
        // 全选/取消全选
        if (window.filterSelectAllBtn) {
            window.filterSelectAllBtn.addEventListener('click', () => {
                const all = document.querySelectorAll('.filter-sku-check');
                const isAllSelected = window.filterSelectAllBtn.textContent.includes('取消全选');
                all.forEach(cb => cb.checked = !isAllSelected);
                window.filterSelectAllBtn.innerHTML = isAllSelected
                    ? '<i class="fa-solid fa-check-double"></i> 全选'
                    : '<i class="fa-solid fa-times"></i> 取消全选';
            });
        }
    }

    // ─────────── 筛选方案折叠 ───────────
    function initFilterConfigCollapse() {
        const toggle = document.getElementById('filterConfigToggleHeader');
        const icon = document.getElementById('filterConfigToggleIcon');
        const wrapper = document.getElementById('filterConfigCollapseWrapper');
        if (!toggle || !icon || !wrapper) return;
        const KEY = 'filter_config_collapsed_v1';
        const saved = lsGet(KEY, true); // 默认折叠
        wrapper.className = saved ? 'collapsed-content' : 'expanded-content';
        icon.className = saved ? 'fa-solid fa-chevron-right text-gray-400' : 'fa-solid fa-chevron-down text-gray-400';
        toggle.addEventListener('click', () => {
            const now = wrapper.classList.contains('expanded-content');
            wrapper.className = now ? 'collapsed-content' : 'expanded-content';
            icon.className = now ? 'fa-solid fa-chevron-right text-gray-400' : 'fa-solid fa-chevron-down text-gray-400';
            lsSet(KEY, now);
        });
    }

    window.initFilterPage = initFilterPage;
    window.runFilter = runFilter;
    window.refreshFilterConditionsUI = renderConditionsUI;
})();
