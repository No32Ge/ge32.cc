
// ============== 文件处理（挂载到 window） ==============
(function() {
    const { $, esc, lsGet, lsSet, log, showToastDedup, columnLetter } = window;

    function loadSheet() {
        const { workbook, currentSheetName, sheetSelect, skuColSelect, parentColSelect, allColumns, rawDataRows, dataStatus, dedupSkuField, dedupStatsArea, dedupIntegrationNote, lastDedupColName } = window;
        if (!workbook || !currentSheetName) return;
        try {
            const sheet = workbook.Sheets[currentSheetName];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            if (!json.length) { log('工作表为空', 'error'); return; }
            window.rawDataRows = json;
            window.allColumns = Object.keys(json[0]);
            const cols = window.allColumns;
            const updateDatalist = (listId) => {
                const dl = document.getElementById(listId);
                if (dl) dl.innerHTML = cols.map(c => `<option value="${esc(c)}">`).join('');
            };
            updateDatalist('skuColList');
            updateDatalist('parentColList');
            skuColSelect.disabled = parentColSelect.disabled = false;
            const find = keys => cols.find(c => keys.some(k => c.toLowerCase().includes(k)));
            const sku = find(['sku', '商品编码', '子sku']) || '';
            const parent = find(['父', 'parent', '父sku']) || '';
            skuColSelect.value = sku;
            parentColSelect.value = parent;
            log(`📊 已加载 "${currentSheetName}"，${json.length}行`, 'info');
            window.processedData = [];
            dedupStatsArea.innerHTML = '';
            if (dedupIntegrationNote) dedupIntegrationNote.style.display = 'none';
            window.lastDedupColName = '';
            window.updateDedupDatalist();
            window.updateDedupFieldHints();
            window.updateDedupReadyStatus();
            dataStatus.textContent = `✅ 已加载 ${json.length} 行`;
            // 刷新价格计算器字段下拉框
            if (window.populatePriceColumnSelects) {
                setTimeout(() => window.populatePriceColumnSelects(), 50);
            }
            // 输出颜色匹配状态
            if (window.logColorMatchStatus) window.logColorMatchStatus();
        } catch { log('加载工作表失败', 'error'); }
    }

    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                window.workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                const sheetSelect = window.sheetSelect;
                sheetSelect.innerHTML = window.workbook.SheetNames.map(n => `<option>${n}</option>`).join('');
                sheetSelect.disabled = false;
                window.currentSheetName = window.workbook.SheetNames[0];
                sheetSelect.value = window.currentSheetName;
                loadSheet();
                log(`📁 文件 "${file.name}" 已加载`, 'info');
            } catch { log('文件解析失败', 'error'); }
        };
        reader.readAsArrayBuffer(file);
    }

    window.loadSheet = loadSheet;
    window.handleFile = handleFile;
})();
