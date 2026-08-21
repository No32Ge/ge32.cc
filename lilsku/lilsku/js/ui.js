
// ============== UI 交互、折叠、全屏、事件绑定 ==============
(function() {
    const { $, esc, lsGet, lsSet, log } = window;

    function initCollapse(toggle, icon, wrapper, cls, key) {
        const saved = lsGet(key, false);
        wrapper.className = saved ? 'collapsed-content' : cls;
        icon.className = saved ? 'fa-solid fa-chevron-right text-gray-400' : 'fa-solid fa-chevron-down text-gray-400';
        toggle.addEventListener('click', () => {
            const now = wrapper.classList.contains(cls);
            wrapper.className = now ? 'collapsed-content' : cls;
            icon.className = now ? 'fa-solid fa-chevron-right text-gray-400' : 'fa-solid fa-chevron-down text-gray-400';
            lsSet(key, now);
            if (window.mappingEditor && wrapper === window.mappingCollapseWrapper) setTimeout(() => window.mappingEditor.refresh(), 350);
            if (window.codeEditor && wrapper === window.codeCollapseWrapper) setTimeout(() => window.codeEditor.refresh(), 350);
            if (window.colorEnumEditor && wrapper === window.colorEnumCollapseWrapper) setTimeout(() => window.colorEnumEditor.refresh(), 350);
        });
    }

    function toggleFullscreen(card, editor, btn) {
        const is = card.classList.contains('fullscreen-card');
        card.classList.toggle('fullscreen-card');
        btn.innerHTML = is ? '<i class="fa-solid fa-expand"></i>' : '<i class="fa-solid fa-compress"></i>';
        if (editor) setTimeout(() => {
            editor.refresh();
            editor.setSize('100%', is ? 'auto' : '100%');
        }, 100);
    }

    // 标签切换
    function switchTab(tab) {
        window.mainPage.style.display = tab === 'main' ? 'block' : 'none';
        window.filterPage.style.display = tab === 'filter' ? 'block' : 'none';
        window.configPage.style.display = tab === 'config' ? 'block' : 'none';
        window.tabMainBtn.classList.toggle('active', tab === 'main');
        window.tabFilterBtn.classList.toggle('active', tab === 'filter');
        window.tabConfigBtn.classList.toggle('active', tab === 'config');
        if (tab === 'filter') {
            // 刷新筛选器列下拉，确保最新列可见
            if (window.refreshFilterConditionsUI) {
                setTimeout(() => window.refreshFilterConditionsUI(), 50);
            }
        } else if (tab !== 'main') {
            setTimeout(() => {
                [window.mappingEditor, window.colorEnumEditor, window.codeEditor, window.priceFormulaEditor].forEach(ed => {
                    if (ed) ed.refresh();
                });
            }, 100);
        }
    }

    // 绑定所有事件
    function bindEvents() {
        window.tabMainBtn.addEventListener('click', () => switchTab('main'));
        window.tabFilterBtn.addEventListener('click', () => switchTab('filter'));
        window.tabConfigBtn.addEventListener('click', () => switchTab('config'));

        // 价格计算相关事件已在 price-calculator.js 中绑定，这里只保留不冲突的部分。
        // 去重执行
        window.dedupRunBtn.addEventListener('click', window.runDedup);
        window.dedupResetFieldsBtn.addEventListener('click', window.resetDedupFieldsToDefault);

        // 去重字段变化
        const dedupInputs = [window.dedupInputField, window.dedupGroupField, window.dedupOutputField, window.dedupMode];
        dedupInputs.forEach(el => {
            if (!el) return;
            el.addEventListener('input', () => {
                window.saveDedupFields();
                window.updateDedupFieldHints();
                window.updateDedupReadyStatus();
            });
            el.addEventListener('change', () => {
                window.saveDedupFields();
                window.updateDedupFieldHints();
                window.updateDedupReadyStatus();
            });
            el.addEventListener('focus', () => window.updateDedupDatalist());
        });

        // 文件加载
        window.fileInput.addEventListener('change', e => e.target.files[0] && window.handleFile(e.target.files[0]));
        window.loadSheetBtn.addEventListener('click', () => {
            if (window.workbook) {
                window.currentSheetName = window.sheetSelect.value;
                window.loadSheet();
            }
        });

        // 处理 & 导出
        window.runProcessBtn.addEventListener('click', window.runProcess);
        window.exportBtn.addEventListener('click', window.exportData);

        // 配置管理
        window.saveConfigBtn.addEventListener('click', () => {
            const name = prompt('方案名称：', window.currentConfig.name || '新方案');
            if (!name) return;
            const cfgs = window.loadConfigs();
            const cfg = window.getCurrentFullConfig();
            cfg.name = name;
            const idx = cfgs.findIndex(c => c.name === name);
            if (idx >= 0) {
                // 已存在的方案，保留其原有的默认状态
                cfg.isDefault = cfgs[idx].isDefault;
                cfgs[idx] = cfg;
            } else {
                // 新建方案，不自动设为默认
                cfg.isDefault = false;
                cfgs.push(cfg);
            }
            window.saveConfigs(cfgs);
            window.currentConfig.name = name;
            log('方案已保存', 'success');
        });
        window.exportConfigBtn.addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(window.loadConfigs(), null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'variant_configs.json';
            a.click();
        });
        window.importConfigFile.addEventListener('change', e => {
            const f = e.target.files[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = ev => {
                try {
                    window.saveConfigs(JSON.parse(ev.target.result));
                    log('导入成功', 'success');
                } catch { log('无效JSON', 'error'); }
                window.importConfigFile.value = '';
            };
            r.readAsText(f);
        });

        // 重置按钮
        window.resetMappingBtn.addEventListener('click', () => window.mappingEditor.setValue(window.DEFAULT_MAPPING));
        window.resetCodeBtn.addEventListener('click', () => window.codeEditor.setValue(window.DEFAULT_CODE));
        window.resetColorEnumBtn.addEventListener('click', () => {
            window.colorEnumEditor.setValue(JSON.stringify(window.DEFAULT_COLOR_ENUM, null, 2));
            window.saveColorEnumFromEditor();
            window.updateColorUnmappedMini();
        });

        // 拖拽上传
        document.body.addEventListener('dragover', e => e.preventDefault());
        document.body.addEventListener('drop', e => {
            e.preventDefault();
            if (e.dataTransfer.files[0]) window.handleFile(e.dataTransfer.files[0]);
        });

        // 全屏
        window.mappingFullscreenBtn.addEventListener('click', e => {
            e.stopPropagation();
            toggleFullscreen(window.mappingCard, window.mappingEditor, window.mappingFullscreenBtn);
        });
        window.colorEnumFullscreenBtn.addEventListener('click', e => {
            e.stopPropagation();
            toggleFullscreen(window.colorEnumCard, window.colorEnumEditor, window.colorEnumFullscreenBtn);
        });
        window.codeFullscreenBtn.addEventListener('click', e => {
            e.stopPropagation();
            toggleFullscreen(window.codeCard, window.codeEditor, window.codeFullscreenBtn);
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                if (window.mappingCard.classList.contains('fullscreen-card')) toggleFullscreen(window.mappingCard, window.mappingEditor, window.mappingFullscreenBtn);
                if (window.colorEnumCard.classList.contains('fullscreen-card')) toggleFullscreen(window.colorEnumCard, window.colorEnumEditor, window.colorEnumFullscreenBtn);
                if (window.codeCard.classList.contains('fullscreen-card')) toggleFullscreen(window.codeCard, window.codeEditor, window.codeFullscreenBtn);
            }
        });

        // 列变化时刷新下拉
        window.skuColSelect.addEventListener('change', () => window.updateDedupDatalist());
        window.parentColSelect.addEventListener('change', () => window.updateDedupDatalist());

        // 本地修复颜色按钮
        window.colorFixBtn.addEventListener('click', window.runColorFix);
        window.quickFixBtn.addEventListener('click', window.runColorFix);

        // 主页快捷按钮事件
        window.quickPriceBtn.addEventListener('click', window.runPriceCalc);
        window.quickDedupBtn.addEventListener('click', window.runDedup);

        // 枚举归类按钮
        window.classifyRunBtn.addEventListener('click', window.runClassification);


        // 筛选页初始化 (仅绑定事件，条件渲染在 filter.js)
        if (window.initFilterPage) {
            window.initFilterPage();
        }

        // 去重折叠
        const dedupSaved = lsGet(window.LK_DEDUP_COLLAPSED, false);
        window.dedupCollapseWrapper.className = dedupSaved ? 'collapsed-content' : 'expanded-content-dedup';
        window.dedupToggleIcon.className = dedupSaved ? 'fa-solid fa-chevron-right text-gray-400' : 'fa-solid fa-chevron-down text-gray-400';
        window.dedupToggleHeader.addEventListener('click', () => {
            const now = window.dedupCollapseWrapper.classList.contains('expanded-content-dedup');
            window.dedupCollapseWrapper.className = now ? 'collapsed-content' : 'expanded-content-dedup';
            window.dedupToggleIcon.className = now ? 'fa-solid fa-chevron-right text-gray-400' : 'fa-solid fa-chevron-down text-gray-400';
            lsSet(window.LK_DEDUP_COLLAPSED, now);
        });
    }

    window.initCollapse = initCollapse;
    window.toggleFullscreen = toggleFullscreen;
    window.bindEvents = bindEvents;
})();
