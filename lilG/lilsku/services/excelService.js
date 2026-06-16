
// 封装 SheetJS (XLSX) 相关操作，减少对全局的依赖

export function parseWorkbook(arrayBuffer) {
    return XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
}

export function getSheetNames(workbook) {
    return workbook.SheetNames;
}

export function sheetToJson(workbook, sheetName) {
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    const columns = json.length > 0 ? Object.keys(json[0]) : [];
    return { rows: json, columns };
}

export function exportToExcel(rows, columns, fileNamePrefix = 'variant_result') {
    if (!rows.length) throw new Error('无数据可导出');
    const exportCols = columns.filter(c => Object.prototype.hasOwnProperty.call(rows[0], c));
    const exportRows = rows.map(row => {
        const obj = {};
        exportCols.forEach(c => obj[c] = row[c] ?? '');
        return obj;
    });
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "结果");
    XLSX.writeFile(wb, `${fileNamePrefix}_${Date.now()}.xlsx`);
}
