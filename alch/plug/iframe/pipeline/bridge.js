// ==UserScript== / 宿主桥接脚本 bridge.js
(function() {
    'use strict';
    // 防重复执行保护
    if (window.__PIPELINE_BRIDGE_LOADED__) return;
    window.__PIPELINE_BRIDGE_LOADED__ = true;

    console.log("⚡ [Pipeline Bridge] 正在装载管线桥接加载器...");

    // 指向同目录下的 iframe 入口页面
    const IFRAME_SOURCE_URL = 'https://www.ge32.cc/alch/plug/iframe/pipeline/index.html';

    // 存储当前激活的 iframe 引用与回滚快照
    const activeInstances = new Map();

    // 1. 创建并挂载 iframe 卡片
    window.appendPreprocessCard = function() {
        if (typeof rawExcelData === 'undefined' || !rawExcelData || rawExcelData.length === 0) return;

        const cardId = 'pipeline-iframe-card-' + Date.now();
        const chatArea = document.getElementById('chatArea') || document.querySelector('.chat-messages') || document.body;

        const cardHTML = `
            <div class="chat-msg" id="${cardId}">
                <div class="avatar" style="background: linear-gradient(135deg, #4f46e5, #06b6d4); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white;">
                    <i class="fa-solid fa-wand-magic-sparkles" style="font-size:14px;"></i>
                </div>
                <div class="bubble border-indigo-100 bg-white shadow-lg" style="width: 100%; max-width: 800px; padding: 0; overflow: hidden; border-radius: 12px; border: 1px solid #e0e7ff;">
                    <iframe id="${cardId}-iframe" 
                            src="${IFRAME_SOURCE_URL}?cardId=${cardId}" 
                            style="width: 100%; height: 500px; border: none; display: block;"
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

    // 2. 跨文档通信监听器 (与 iframe 双向通讯)
    window.addEventListener('message', function(e) {
        const data = e.data;
        if (!data || !data.action || !data.cardId) return;

        const instance = activeInstances.get(data.cardId);
        if (!instance) return;

        switch (data.action) {
            // A. iframe 初始化完成，请求数据
            case 'IFRAME_READY': {
                instance.iframeEl.contentWindow.postMessage({
                    action: 'INIT_DATA',
                    cardId: data.cardId,
                    headers: window.headers || [],
                    rawExcelData: window.rawExcelData || []
                }, '*');
                break;
            }

            // B. 自适应高度同步 (避免内层出现双滚动条)
            case 'RESIZE_HEIGHT': {
                if (data.height && data.height > 200) {
                    instance.iframeEl.style.height = `${data.height}px`;
                    if (typeof scrollToBottom === 'function') scrollToBottom();
                }
                break;
            }

            // C. 执行全量数据追加写入
            case 'APPLY_CHANGES': {
                const { compiledColNames, newRowsData, addedColCount } = data.payload;

                instance.rollbackSnapshot = {
                    prevHeaderLength: headers.length,
                    addedColCount: addedColCount
                };

                newRowsData.forEach((rowObj, idx) => {
                    if (window.rawExcelData[idx]) {
                        compiledColNames.forEach(colName => {
                            window.rawExcelData[idx].row.push(rowObj[colName] !== undefined ? rowObj[colName] : '');
                        });
                    }
                });

                compiledColNames.forEach(h => window.headers.push(h));
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

            // D. 撤销数据追加
            case 'UNDO_CHANGES': {
                if (!instance.rollbackSnapshot) return;
                const { prevHeaderLength } = instance.rollbackSnapshot;

                window.headers.splice(prevHeaderLength);
                window.rawExcelData.forEach(item => {
                    item.row.splice(prevHeaderLength);
                });

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

            // E. 代理宿主 Toast
            case 'SHOW_TOAST': {
                if (typeof showToast === 'function') {
                    showToast(data.message, data.level || 'info');
                } else {
                    console.log(`[Toast] [${data.level}] ${data.message}`);
                }
                break;
            }
        }
    });

    function refreshHostDOM(newCols = []) {
        const fieldPreview = document.getElementById('fieldPreview');
        if (fieldPreview && Array.isArray(window.headers)) {
            fieldPreview.innerHTML = window.headers.map(h => h ? `
                <span draggable="true" ondragstart="dragVarStart(event, '${h}')" ondragend="dragVarEnd(event)" 
                      class="var-tag bg-white px-2 py-1 rounded shadow-sm mr-1.5 mb-1.5 inline-block text-[0.65rem] cursor-grab border border-indigo-100 font-semibold ${newCols.includes(h) ? '!border-emerald-400 !bg-emerald-50 text-emerald-700' : ''}">
                    <i class="fa-solid fa-grip-vertical text-slate-300 mr-1"></i>${h}
                </span>` : '').join('');
        }
        if (typeof window.updateTemplateMirror === 'function') {
            window.updateTemplateMirror();
        }
    }

    // 3. 上传文件拦截劫持
    const originalAppendSystemMessage = window.appendSystemMessage;
    window.appendSystemMessage = function(text) {
        if (typeof originalAppendSystemMessage === 'function') {
            originalAppendSystemMessage.apply(this, arguments);
        }
        if (typeof text === 'string' && text.includes('已成功读取')) {
            setTimeout(() => window.appendPreprocessCard(), 300);
        }
    };

    if (typeof rawExcelData !== 'undefined' && rawExcelData.length > 0) {
        window.appendPreprocessCard();
    }

    console.log("✅ [Pipeline Bridge] 桥接器装载完成！");
})();