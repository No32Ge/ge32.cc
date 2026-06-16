
import { lsGet, lsSet } from '../utils/storage.js';
import { log } from '../utils/log.js';
import { esc } from '../utils/dom.js';
import { LK_COLOR_ENUM, DEFAULT_COLOR_ENUM } from '../config/manager.js';

export function getStoredColorEnum() {
    return lsGet(LK_COLOR_ENUM, DEFAULT_COLOR_ENUM);
}

export function saveColorEnumToStorage(enumObj) {
    lsSet(LK_COLOR_ENUM, enumObj);
}

export function getColorColumnName(mappingEditor) {
    try {
        const m = JSON.parse(mappingEditor.getValue());
        return m.color || null;
    } catch { return null; }
}

export function scanColorValues(rawDataRows, allColumns, mappingEditor) {
    if (!rawDataRows.length) return [];
    const col = getColorColumnName(mappingEditor);
    if (!col || !allColumns.includes(col)) return [];
    const unique = new Set();
    rawDataRows.forEach(r => { const v = String(r[col] || '').trim(); if (v) unique.add(v); });
    return Array.from(unique);
}

export function findUnmappedColors(rawDataRows, allColumns, mappingEditor, colorEnumEditor) {
    const allColors = scanColorValues(rawDataRows, allColumns, mappingEditor);
    if (!allColors.length) return [];
    let enumConfig;
    try { enumConfig = JSON.parse(colorEnumEditor.getValue()); } catch { return allColors.map(c => ({ display: c, count: 1 })); }
    const exactMap = new Map();
    for (const [cat, aliases] of Object.entries(enumConfig)) {
        if (Array.isArray(aliases)) aliases.forEach(a => { const k = String(a).trim().toLowerCase(); if (k) exactMap.set(k, cat); });
    }
    const fuzzyRules = [
        { regex: /^[a-z]$/i },
        { regex: /^multiple[a-z]*$/i },
        { regex: /^multicolou?r[a-z]*$/i },
        { regex: /^mixed\s*colou?r[a-z]*$/i },
        { regex: /^mixedcolou?r[a-z]*$/i },
        { regex: /^mixed\s+colou?rs?[a-z]*$/i },
        { regex: /^mixed[\s\-_]?colou?r[a-z]*$/i },
        { regex: /^mixed\s+colors?[a-z]*$/i }
    ];
    const unmapped = [];
    allColors.forEach(c => {
        const norm = c.toLowerCase();
        if (exactMap.has(norm)) return;
        if (fuzzyRules.some(r => r.regex.test(norm))) return;
        unmapped.push({ display: c, count: 1 });
    });
    return unmapped;
}

export function updateColorUnmappedMini(rawDataRows, allColumns, mappingEditor, colorEnumEditor, colorUnmappedMini) {
    const unmapped = findUnmappedColors(rawDataRows, allColumns, mappingEditor, colorEnumEditor);
    if (!unmapped.length) { colorUnmappedMini.classList.add('hidden'); return; }
    colorUnmappedMini.classList.remove('hidden');
    const tags = unmapped.slice(0, 15).map(u => `<span class="unmapped-tag">${esc(u.display)}</span>`).join('');
    const more = unmapped.length > 15 ? ` ...及另外${unmapped.length - 15}项` : '';
    colorUnmappedMini.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-yellow-400"></i> 未映射: ${tags}${more}`;
}
