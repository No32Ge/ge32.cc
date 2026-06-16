
// 沃尔玛颜色去重逻辑：在同 Variant Group 下，确保颜色唯一，通过追加字母区分

function columnLetter(index) {
    let dividend = index + 1;
    let result = '';
    while (dividend > 0) {
        const modulo = (dividend - 1) % 26;
        result = String.fromCharCode(65 + modulo) + result;
        dividend = Math.floor((dividend - 1) / 26);
    }
    return result;
}

/**
 * 对数据执行颜色去重，在原数组上直接新增一列
 * @param {Array<Object>} rows - 数据行（引用将被修改）
 * @param {Object} options
 * @param {string} options.colorTypeCol - 颜色类型列名
 * @param {string} options.groupCol - Variant Group 列名
 * @param {string} options.colorCol - 原始颜色列名
 * @param {string} options.skuCol - SKU 列名（用于排序）
 * @param {string} options.newColName - 新增的去重颜色列名
 * @returns {{ stats: { totalRows: number, groupsModified: number, totalRowsModified: number, newColName: string } }}
 */
export function runDedup(rows, { colorTypeCol, groupCol, colorCol, skuCol, newColName }) {
    if (!rows.length) throw new Error('无数据');
    if (!colorTypeCol || !groupCol || !colorCol || !skuCol || !newColName) {
        throw new Error('请填写所有去重字段');
    }

    const allCols = Object.keys(rows[0]);
    const missing = [colorTypeCol, groupCol, colorCol, skuCol].filter(f => !allCols.includes(f));
    if (missing.length) {
        throw new Error(`字段不存在: ${missing.join(', ')}`);
    }

    // 清理可能存在的旧去重列，如果存在且名称不同
    // 注意：这里我们只负责去重，清理工作由调用方完成

    const resultRows = rows;
    const idxGroup = allCols.indexOf(groupCol);
    const idxColor = allCols.indexOf(colorCol);
    const idxColorType = allCols.indexOf(colorTypeCol);
    const idxSKU = allCols.indexOf(skuCol);

    // 分组
    const groupMap = new Map();
    resultRows.forEach((row, i) => {
        const gid = String(row[groupCol] || '').trim();
        if (!groupMap.has(gid)) groupMap.set(gid, []);
        groupMap.get(gid).push(i);
    });

    let groupsModified = 0;
    let totalRowsModified = 0;
    const newValues = new Array(resultRows.length).fill(null);

    for (const [gid, indices] of groupMap.entries()) {
        if (indices.length <= 1) {
            indices.forEach(i => newValues[i] = String(resultRows[i][colorCol] || '').trim());
            continue;
        }
        const colorVals = indices.map(i => String(resultRows[i][colorCol] || '').trim());
        // 如果所有颜色已唯一，不做修改
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
                if (String(resultRows[rowIdx][colorCol] || '').trim() !== newColor) {
                    totalRowsModified++;
                }
            });
        }
    }

    // 写入新列
    resultRows.forEach((row, i) => {
        if (newValues[i] !== null) {
            row[newColName] = newValues[i];
        }
    });

    return {
        stats: {
            totalRows: resultRows.length,
            groupsModified,
            totalRowsModified,
            newColName
        }
    };
}
