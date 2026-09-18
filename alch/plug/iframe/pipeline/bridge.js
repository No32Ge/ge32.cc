// ==UserScript== / 宿主桥接脚本 bridge.js (增强穿透版)
(function() {
    'use strict';
    console.log("⚡ [Pipeline Bridge] 正在装载管线桥接加载器...");

    const IFRAME_SOURCE_URL = 'https://www.ge32.cc/alch/plug/iframe/pipeline/index.html';
    const activeInstances = new Map();

    // 安全穿透提取宿主顶层变量（兼容 let、const、var 及 window 属性）
    function getHostVar(varName) {
        try {
            if (typeof window[varName] !== 'undefined') return window[varName];
            return window.eval(`typeof ${varName} !== 'undefined' ? ${varName} : undefined`);
        } catch (e) {
            return undefined;
        }
    }

    // 安全获取当前表格数据
    function getTableData() {
        const h = getHostVar('headers') || [];
        const d = getHostVar('rawExcelData') || [];
        return { headers: h, rawExcelData: d };
    }

    // 1. 创建并挂载 iframe 卡片
    window.appendPreprocessCard = function() {
        const { rawExcelData } = getTableData();
        if (!rawExcelData || rawExcelData.length === 0) {
            console.warn("[Pipeline Bridge] 暂无有效数据，等待数据加载...");
            return;
        }

        const cardId = 'pipeline-iframe-card-' + Date.now();
        const chatArea = document.getElementById('chatArea') || document.querySelector('.chat-messages') || document.body;

        const cardHTML = `
            <div class="chat-msg" id="${cardId}">
                <div class="avatar" style="background: linear-gradient(135deg, #4f46e5, #06b6d4); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white;">
                    <i class="fa-solid fa-wand-magic-sparkles" style="font-size:14px;"></i>
                </div>
                <div class="bubble border-indigo-100 bg-white shadow-lg" style="width: 100%; max-width: 800px; padding: 0; overflow: hidden; border-radius: 12px; border: 1px solid #e0e7ff;">
                    <iframe id="${cardId}-iframe" 
                            src="${IFRAME_SOURCE_URL}?cardId=${cardId}&t=${Date.now()}" 
                            style="width: 100%; height: 520px; border: none; display: block;"
                            allow="clipboard-read; clipboard-write">
                    </iframe>
                </div>
            </div>
        `;

        chatArea.insertAdjacentHTML('beforeend', cardHTML);
        if (typeof scrollToBottom === 'function') scrollToBottom();

        const iframeEl = document.getElementById(`${cardId}-iframe`);
        activeInstances.set(cardId, { iframeEl, rollbackSnapshot: null });
    };

    // 2. 跨文档通信
    window.addEventListener('message', function(e) {
        const data = e.data;
        if (!data || !data.action || !data.cardId) return;

        const instance = activeInstances.get(data.cardId);
        if (!instance) return;

        switch (data.action) {
            // A. iframe 初始化完成，或主动索取数据
            case 'IFRAME_READY':
            case 'REQ_DATA': {
                const { headers, rawExcelData } = getTableData();
                instance.iframeEl.contentWindow.postMessage({
                    action: 'INIT_DATA',
                    cardId: data.cardId,
                    headers: headers,
                    rawExcelData: rawExcelData
                }, '*');
                break;
            }

            // B. 高度自适应
            case 'RESIZE_HEIGHT': {
                if (data.height && data.height > 200) {
                    instance.iframeEl.style.height = `${data.height}px`;
                }
                break;
            }

            // C. 执行全量数据追加写入
            case 'APPLY_CHANGES': {
                const { compiledColNames, newRowsData, addedColCount } = data.payload;
                const { headers, rawExcelData } = getTableData();

                if (!Array.isArray(headers) || !Array.isArray(rawExcelData)) {
                    alert("写入失败：未检测到宿主数据容器！");
                    return;
                }

                // 记录快照
                instance.rollbackSnapshot = {
                    prevHeaderLength: headers.length,
                    addedColCount: addedColCount
                };

                // 追加数据列
                newRowsData.forEach((rowObj, idx) => {
                    if (rawExcelData[idx] && Array.isArray(rawExcelData[idx].row)) {
                        compiledColNames.forEach(colName => {
                            rawExcelData[idx].row.push(rowObj[colName] !== undefined ? rowObj[colName] : '');
                        });
                    }
                });

                // 追加表头
                compiledColNames.forEach(h => headers.push(h));

                refreshHostDOM(compiledColNames);

                instance.iframeEl.contentWindow.postMessage({
                    action: 'APPLY_SUCCESS',
                    cardId: data.cardId
                }, '*');

                if (typeof showToast === 'function') {
                    showToast(`🎉 成功写入 ${compiledColNames.length} 个新字段到全表！`, 'success');
                }
                break;
            }

            // D. 撤销
            case 'UNDO_CHANGES': {
                if (!instance.rollbackSnapshot) return;
                const { headers, rawExcelData } = getTableData();
                const { prevHeaderLength } = instance.rollbackSnapshot;

                if (Array.isArray(headers)) headers.splice(prevHeaderLength);
                if (Array.isArray(rawExcelData)) {
                    rawExcelData.forEach(item => {
                        if (item && Array.isArray(item.row)) {
                            item.row.splice(prevHeaderLength);
                        }
                    });
                }

                instance.rollbackSnapshot = null;
                refreshHostDOM([]);

                instance.iframeEl.contentWindow.postMessage({
                    action: 'UNDO_SUCCESS',
                    cardId: data.cardId
                }, '*');

                if (typeof showToast === 'function') {
                    showToast("✅ 已成功撤销上次追加的数据列！", 'info');
                }
                break;
            }

            // E. Toast
            case 'SHOW_TOAST': {
                if (typeof showToast === 'function') {
                    showToast(data.message, data.level || 'info');
                }
                break;
            }
        }
    });

    function refreshHostDOM(newCols = []) {
        const { headers } = getTableData();
        const fieldPreview = document.getElementById('fieldPreview');
        if (fieldPreview && Array.isArray(headers)) {
            fieldPreview.innerHTML = headers.map(h => h ? `
                <span draggable="true" ondragstart="dragVarStart(event, '${h}')" ondragend="dragVarEnd(event)" 
                      class="var-tag bg-white px-2 py-1 rounded shadow-sm mr-1.5 mb-1.5 inline-block text-[0.65rem] cursor-grab border border-indigo-100 font-semibold ${newCols.includes(h) ? '!border-emerald-400 !bg-emerald-50 text-emerald-700' : ''}">
                    <i class="fa-solid fa-grip-vertical text-slate-300 mr-1"></i>${h}
                </span>` : '').join('');
        }
        if (typeof window.updateTemplateMirror === 'function') {
            window.updateTemplateMirror();
        }
    }

    // 拦截文件上传完成事件
    const originalAppendSystemMessage = window.appendSystemMessage;
    window.appendSystemMessage = function(text) {
        if (typeof originalAppendSystemMessage === 'function') {
            originalAppendSystemMessage.apply(this, arguments);
        }
        if (typeof text === 'string' && text.includes('已成功读取')) {
            setTimeout(() => window.appendPreprocessCard(), 300);
        }
    };

    const { rawExcelData } = getTableData();
    if (rawExcelData && rawExcelData.length > 0) {
        window.appendPreprocessCard();
    }

    console.log("✅ [Pipeline Bridge] 增强桥接器就绪");
})();