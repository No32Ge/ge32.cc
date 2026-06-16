
import { log } from '../utils/log.js';
import { esc } from '../utils/dom.js';

let workbook = null;
let currentSheetName = '';
let rawDataRows = [];
let allColumns = [];

export function getWorkbook() { return workbook; }
export function getCurrentSheetName() { return currentSheetName; }
export function getRawData() { return rawDataRows; }
export function getAllColumns() { return allColumns; }

export function setWorkbook(wb) { workbook = wb; }
export function setCurrentSheetName(name) { currentSheetName = name; }
export function setRawData(data) { rawDataRows = data; }
export function setAllColumns(cols) { allColumns = cols; }

export function loadSheet(sheetName, sheetSelect, skuColSelect, parentColSelect, dedupSkuField, saveDedupFields, updateDedupDatalist, updateDedupFieldHints, updateDedupReadyStatus, dataStatus, dedupStatsArea, dedupIntegrationNote, setLastDedupColName) {
    if (!workbook || !sheetName) return;
    try {
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (!json.length) { log('工作表为空', 'error'); return; }
        rawDataRows = json;
        allColumns = Object.keys(json[0]);
        const opts = allColumns.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
        skuColSelect.innerHTML = parentColSelect.innerHTML = `<option value="">-- 选择列 --</option>${opts}`;
        skuColSelect.disabled = parentColSelect.disabled = false;
        const find = keys => allColumns.find(c => keys.some(k => c.toLowerCase().includes(k)));
        const sku = find(['sku', '商品编码', '子sku']) || '';
        const parent = find(['父', 'parent', '父sku']) || '';
        skuColSelect.value = sku;
        parentColSelect.value = parent;
        log(`📊 已加载 "${sheetName}"，${rawDataRows.length}行`, 'info');
        // 清空处理数据
        // 外部调用者会处理 processedData 重置
        // 这里只负责 rawData
        if (dedupStatsArea) dedupStatsArea.innerHTML = '';
        if (dedupIntegrationNote) dedupIntegrationNote.style.display = 'none';
        setLastDedupColName('');
        if (updateDedupDatalist) updateDedupDatalist();
        if (!dedupSkuField.value.trim() && sku) { dedupSkuField.value = sku; if (saveDedupFields) saveDedupFields(); }
        if (updateDedupFieldHints) updateDedupFieldHints();
        if (updateDedupReadyStatus) updateDedupReadyStatus();
        if (dataStatus) dataStatus.textContent = `✅ 已加载 ${rawDataRows.length} 行`;
    } catch (e) {
        log('加载工作表失败: ' + e.message, 'error');
    }
}

export function handleFile(file, sheetSelect, loadSheetCallback) {
    const reader = new FileReader();
    reader.onload = e => {
        try {
            workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            sheetSelect.innerHTML = workbook.SheetNames.map(n => `<option>${n}</option>`).join('');
            sheetSelect.disabled = false;
            currentSheetName = workbook.SheetNames[0];
            sheetSelect.value = currentSheetName;
            loadSheetCallback();
            log(`📁 文件 "${file.name}" 已加载`, 'info');
        } catch (e) {
            log('文件解析失败: ' + e.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}
