
import { log, showToast } from '../utils/log.js';
import { lsGet, lsSet } from '../utils/storage.js';
import { DEFAULT_DEDUP_FIELDS } from '../defaults.js';

export const LK_DEDUP_FIELDS = 'color_dedup_fields_fusion';

export function getDedupFields() {
    const saved = lsGet(LK_DEDUP_FIELDS, DEFAULT_DEDUP_FIELDS);
    if (!saved || typeof saved !== 'object') return { ...DEFAULT_DEDUP_FIELDS };
    return {
        colorType: saved.colorType || DEFAULT_DEDUP_FIELDS.colorType,
        variantGroup: saved.variantGroup || DEFAULT_DEDUP_FIELDS.variantGroup,
        amazonColor: saved.amazonColor || DEFAULT_DEDUP_FIELDS.amazonColor,
        sku: saved.sku || DEFAULT_DEDUP_FIELDS.sku,
        newColName: saved.newColName || DEFAULT_DEDUP_FIELDS.newColName
    };
}

export function saveDedupFieldsToStorage(fields) {
    lsSet(LK_DEDUP_FIELDS, fields);
}

export function columnLetter(index) {
    let dividend = index + 1, result = '';
    while (dividend > 0) {
        let modulo = (dividend - 1) % 26;
        result = String.fromCharCode(65 + modulo) + result;
        dividend = Math.floor((dividend - 1) / 26);
    }
    return result;
}

export function runDedup(processedData, colorTypeCol, groupCol, colorCol, skuCol, newColName, lastDedupColName, setLastDedupColName, updateUI) {
    if (!processedData.length) { log('❌ 请先执行“变体组处理”', 'error'); return null; }
    if (!colorTypeCol || !groupCol || !colorCol || !skuCol || !newColName) {
        log('❌ 请填写所有字段（包括新增列名）', 'error');
        return null;
    }
    const allCols = Object.keys(processedData[0]);
    const missing = [colorTypeCol, groupCol, colorCol, skuCol].filter(f => !allCols.includes(f));
    if (missing.length > 0) { log(`❌ 字段不存在: ${missing.join(', ')}`, 'error'); return null; }

    // 清理上一次列
    if (lastDedupColName && lastDedupColName !== newColName) {
        processedData.forEach(row => delete row[lastDedupColName]);
        log(`🧹 已移除旧去重列 "${lastDedupColName}"`, 'info');
    }

    const resultRows = processedData;
    // 分组
    const groupMap = new Map();
    resultRows.forEach((row, i) => {
        const gid = String(row[groupCol] || '').trim();
        if (!groupMap.has(gid)) groupMap.set(gid, []);
        groupMap.get(gid).push(i);
    });

    let groupsModified = 0, totalRowsModified = 0;
    const newValues = new Array(resultRows.length).fill(null);
    for (const [gid, indices] of groupMap.entries()) {
        if (indices.length <= 1) {
            indices.forEach(i => newValues[i] = String(resultRows[i][colorCol] || '').trim());
            continue;
        }
        const colorVals = indices.map(i => String(resultRows[i][colorCol] || '').trim());
        if (new Set(colorVals).size === indices.length) {
            indices.forEach(i => newValues[i] = String(resultRows[i][colorCol] || '').trim());
            continue;
        }
        groupsModified++;
        const typeMap = new Map();
        indices.forEach(i => {
            const ct = String(resultRows[i][colorTypeCol] || '').trim();
            if (!typeMap.has(ct)) typeMap.set(ct, []);
            typeMap.get(ct).push(i);
        });
        for (const [ct, rowIndices] of typeMap.entries()) {
            rowIndices.sort((a, b) => String(resultRows[a][skuCol] || '').localeCompare(String(resultRows[b][skuCol] || '')));
            rowIndices.forEach((rowIdx, order) => {
                const newColor = ct ? `${ct} ${columnLetter(order)}` : columnLetter(order);
                newValues[rowIdx] = newColor;
                if (String(resultRows[rowIdx][colorCol] || '').trim() !== newColor) totalRowsModified++;
            });
        }
    }

    resultRows.forEach((row, i) => {
        if (newValues[i] !== null) row[newColName] = newValues[i];
    });

    setLastDedupColName(newColName);
    lsSet('last_dedup_col_name', newColName);
    log(`🎨 颜色去重完成，新增列 "${newColName}"，修改 ${totalRowsModified} 行`, 'success');
    showToast('✅ 去重列已添加，请导出');
    if (updateUI) updateUI(resultRows, groupsModified, totalRowsModified, newColName);
    return resultRows;
}
