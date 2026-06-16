
import { log } from '../utils/log.js';
import { lsGet, lsSet } from '../utils/storage.js';

export function processData(rawDataRows, skuCol, parentCol, mappingJSON, codeString, allColumns, updateUI) {
    if (!rawDataRows.length) { log('请先加载数据', 'error'); return null; }
    if (!skuCol || !parentCol) { log('请选择SKU和父SKU列', 'error'); return null; }
    let columns;
    try { columns = JSON.parse(mappingJSON); } catch { log('映射JSON格式错误', 'error'); return null; }
    columns.sku = skuCol;
    columns.parentSku = parentCol;
    try {
        const fn = new Function('rows', 'columns', 'skuCol', 'parentCol', codeString);
        const result = fn(rawDataRows, columns, skuCol, parentCol);
        if (!Array.isArray(result)) throw new Error('函数必须返回数组');
        const newCols = Object.keys(result[0]).filter(c => !allColumns.includes(c) && !c.startsWith('_'));
        log(`✅ 处理完成，${result.length}行，新增${newCols.length}列: ${newCols.join(', ')}`, 'success');
        if (updateUI) updateUI(result, newCols);
        return result;
    } catch (e) {
        log(`❌ 执行错误: ${e.message}`, 'error');
        return null;
    }
}
