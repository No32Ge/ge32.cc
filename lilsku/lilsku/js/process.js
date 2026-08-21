
// ============== 变体组处理 & 导出 ==============
(function() {
    const { $, esc, lsGet, lsSet, log } = window;

    function runProcess() {
        const rawDataRows = window.rawDataRows;
        if (!rawDataRows.length) {
            log('请先加载数据', 'error');
            return;
        }
        const skuCol = window.skuColSelect.value;
        const parentCol = window.parentColSelect.value;
        if (!skuCol || !parentCol) {
            log('请选择SKU和父SKU列', 'error');
            return;
        }
        let columns;
        try {
            columns = JSON.parse(window.mappingEditor.getValue());
        } catch {
            log('映射JSON格式错误', 'error');
            return;
        }
        columns.sku = skuCol;
        columns.parentSku = parentCol;
        window.saveColorEnumFromEditor();
        try {
            const fn = new Function('rows', 'columns', 'skuCol', 'parentCol', window.codeEditor.getValue());
            const result = fn(rawDataRows, columns, skuCol, parentCol);
            if (!Array.isArray(result)) throw new Error('函数必须返回数组');
            window.processedData = result;
            const newCols = Object.keys(result[0]).filter(c => !window.allColumns.includes(c) && !c.startsWith('_'));
            log(`✅ 处理完成，${result.length}行，新增${newCols.length}列: ${newCols.join(', ')}`, 'success');
            window.dataStatus.textContent = `✅ 已处理 ${result.length} 行`;
            window.updateColorUnmappedMini();
            window.updateDedupDatalist();
            window.updateDedupFieldHints();
            window.dedupStatsArea.innerHTML = '';
            if (window.dedupIntegrationNote) window.dedupIntegrationNote.style.display = 'none';
            window.lastDedupColName = '';
            window.updateDedupReadyStatus();
            // 刷新价格计算器字段下拉框（可能新增了列）
            if (window.populatePriceColumnSelects) {
                window.populatePriceColumnSelects();
            }
            // 输出颜色匹配状态
            if (window.logColorMatchStatus) window.logColorMatchStatus();
        } catch (e) {
            log(`❌ 执行错误: ${e.message}`, 'error');
        }
    }

    function exportData() {
        const processedData = window.processedData;
        if (!processedData.length) {
            log('无数据可导出', 'error');
            return;
        }
        const allCols = Object.keys(processedData[0]);
        const newCols = allCols.filter(c => !window.allColumns.includes(c) && !c.startsWith('_'));
        const skuCol = window.skuColSelect.value;
        let exportCols = [];
        if (window.exportFullCheck.checked) {
            exportCols = allCols.filter(c => !c.startsWith('_'));
        } else {
            exportCols = window.exportNewCheck.checked ? [skuCol, ...newCols.filter(c => c !== skuCol)] : [skuCol];
        }
        exportCols = exportCols.filter(c => allCols.includes(c));
        const exportRows = processedData.map(row => {
            const obj = {};
            exportCols.forEach(c => obj[c] = row[c] ?? '');
            return obj;
        });
        try {
            const ws = XLSX.utils.json_to_sheet(exportRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "结果");
            XLSX.writeFile(wb, `variant_result_${Date.now()}.xlsx`);
            log(`📎 导出成功（${exportCols.length}列）`, 'success');
        } catch {
            log('导出失败', 'error');
        }
    }

    window.runProcess = runProcess;
    window.exportData = exportData;
})();
