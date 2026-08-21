
// ============== 颜色修复与未映射提示 ==============
(function() {
    const { $, esc, lsGet, lsSet, log } = window;

    function getColorColumnName() {
        try {
            const m = JSON.parse(window.mappingEditor.getValue());
            return m.color || null;
        } catch { return null; }
    }

    function scanColorValues() {
        const rawDataRows = window.rawDataRows;
        if (!rawDataRows.length) return [];
        const col = getColorColumnName();
        if (!col || !window.allColumns.includes(col)) return [];
        const unique = new Set();
        rawDataRows.forEach(r => {
            const v = String(r[col] || '').trim();
            if (v) unique.add(v);
        });
        return Array.from(unique);
    }

    function findUnmappedColors() {
        const allColors = scanColorValues();
        if (!allColors.length) return [];
        let enumConfig;
        try {
            enumConfig = JSON.parse(window.colorEnumEditor.getValue());
        } catch {
            return allColors.map(c => ({ display: c, count: 1 }));
        }
        const exactMap = new Map();
        for (const [cat, aliases] of Object.entries(enumConfig)) {
            if (!Array.isArray(aliases)) continue; // 健壮处理：跳过非数组值
            aliases.forEach(a => {
                const k = String(a).trim().toLowerCase();
                if (k) exactMap.set(k, cat);
            });
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

    function updateColorUnmappedMini() {
        const unmapped = findUnmappedColors();
        const colorUnmappedMini = window.colorUnmappedMini;
        if (!unmapped.length) {
            colorUnmappedMini.classList.add('hidden');
            return;
        }
        colorUnmappedMini.classList.remove('hidden');
        const tags = unmapped.slice(0, 15).map(u => `<span class="unmapped-tag">${esc(u.display)}</span>`).join('');
        const more = unmapped.length > 15 ? ` ...及另外${unmapped.length - 15}项` : '';
        colorUnmappedMini.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-yellow-400"></i> 未映射: ${tags}${more}`;
    }

    // 本地修复颜色：将未映射颜色作为别名添加至 Multicolor 分组
    function runColorFix() {
        const unmapped = findUnmappedColors().map(u => u.display);
        if (!unmapped.length) {
            log('✨ 所有颜色已映射，无需修复', 'success');
            return;
        }
        try {
            let cfg = JSON.parse(window.colorEnumEditor.getValue());
            // 确保含有 Multicolor 分组且为数组
            if (!cfg["Multicolor"] || !Array.isArray(cfg["Multicolor"])) {
                cfg["Multicolor"] = [];
            }
            let added = 0;
            unmapped.forEach(c => {
                const val = String(c).trim();
                if (val && !cfg["Multicolor"].includes(val)) {
                    cfg["Multicolor"].push(val);
                    added++;
                }
            });
            if (added > 0) {
                window.colorEnumEditor.setValue(JSON.stringify(cfg, null, 2));
                window.saveColorEnumFromEditor();
                updateColorUnmappedMini();
                log(`✅ 成功修复颜色：已将 ${added} 个未映射颜色添加至 Multicolor`, 'success');
                if (window.logColorMatchStatus) window.logColorMatchStatus();
            } else {
                log('没有新增的颜色需要添加', 'info');
            }
        } catch (e) {
            alert('修复失败，请检查枚举配置 JSON 格式是否正确: ' + e.message);
        }
    }

    // ─────────── 主页颜色匹配日志 & 快捷修复按钮控制 ───────────
    function logColorMatchStatus() {
        const allColors = scanColorValues();
        if (!allColors.length) {
            log('🎨 未检测到颜色列或颜色数据为空', 'info');
            if (window.quickFixBtn) window.quickFixBtn.classList.add('hidden');
            return;
        }
        const unmapped = findUnmappedColors();
        const mappedCount = allColors.length - unmapped.length;
        if (unmapped.length === 0) {
            log(`🎨 颜色匹配：全部已映射 (共${allColors.length}种)`, 'success');
        } else {
            const list = unmapped.slice(0, 10).map(u => u.display).join(', ');
            const more = unmapped.length > 10 ? ` ...及另外${unmapped.length - 10}项` : '';
            log(`⚠️ 颜色匹配：${mappedCount}种已映射，${unmapped.length}种未映射：${list}${more}`, 'warning');
        }
        // 控制主页快捷修复按钮显示
        const btn = window.quickFixBtn;
        if (btn) {
            if (unmapped.length > 0) btn.classList.remove('hidden');
            else btn.classList.add('hidden');
        }
    }

    // ─────────── 枚举归类执行 ───────────
    function runClassification() {
        const sourceCol = window.classifySourceCol ? window.classifySourceCol.value.trim() : '';
        const outputCol = window.classifyOutputCol ? window.classifyOutputCol.value.trim() : 'Color Classification';
        if (!sourceCol) {
            log('❌ 请选择源数据列', 'error');
            return;
        }
        const data = window.processedData.length ? window.processedData : window.rawDataRows;
        if (!data.length) {
            log('❌ 暂无数据', 'error');
            return;
        }
        const allCols = window.processedData.length ? window.getAllAvailableColumns() : window.allColumns;
        if (!allCols.includes(sourceCol)) {
            log(`❌ 源数据列 "${sourceCol}" 不存在`, 'error');
            return;
        }
        // 获取枚举配置
        window.saveColorEnumFromEditor();
        let enumConfig;
        try {
            enumConfig = JSON.parse(window.colorEnumEditor.getValue());
        } catch {
            log('❌ 枚举JSON格式错误', 'error');
            return;
        }
        const exactMap = new Map();
        for (const [cat, aliases] of Object.entries(enumConfig)) {
            if (Array.isArray(aliases))
                aliases.forEach(a => {
                    const k = String(a).trim().toLowerCase();
                    if (k) exactMap.set(k, cat);
                });
        }
        let matched = 0, unmatched = 0;
        data.forEach(row => {
            const raw = String(row[sourceCol] || '').trim();
            if (!raw) { row[outputCol] = ''; unmatched++; return; }
            const norm = raw.toLowerCase();
            const mapped = exactMap.get(norm);
            if (mapped) {
                row[outputCol] = mapped;
                matched++;
            } else {
                row[outputCol] = raw;
                unmatched++;
            }
        });
        log(`🏷️ 归类完成: ${matched} 条精确匹配, ${unmatched} 条保留原值`, 'success');
        window.dataStatus.textContent = `✅ 归类完成，新列 "${outputCol}"`;
        if (window.updateDedupDatalist) window.updateDedupDatalist();
        if (window.updateDedupFieldHints) window.updateDedupFieldHints();
    }

    window.getColorColumnName = getColorColumnName;
    window.scanColorValues = scanColorValues;
    window.findUnmappedColors = findUnmappedColors;
    window.updateColorUnmappedMini = updateColorUnmappedMini;
    window.logColorMatchStatus = logColorMatchStatus;
    window.runColorFix = runColorFix;
    window.runClassification = runClassification;
})();
