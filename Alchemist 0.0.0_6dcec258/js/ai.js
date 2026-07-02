
// ================= 核心 AI 处理流 =================
let activeAbortController = null;

async function fetchAIResponse(messages, config, attempt = 1, signal = null) {
    if (config.delay > 0 && attempt === 1) {
        const delayMs = config.delay * 1000;
        let timer;
        const delayPromise = new Promise(r => { timer = setTimeout(r, delayMs); });
        const cancelPromise = new Promise((_, reject) => {
            if (signal) {
                signal.addEventListener('abort', () => {
                    clearTimeout(timer);
                    reject(new DOMException('Aborted', 'AbortError'));
                });
            }
        });
        await Promise.race([delayPromise, cancelPromise]);
    }
    
    try {
        let ep = config.baseUrl; if (!ep.endsWith('/chat/completions')) ep = ep.replace(/\/$/, '') + '/chat/completions';
        const r = await fetch(ep, { 
            method: 'POST', 
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${config.apiKey}` 
            }, 
            body: JSON.stringify({ model: config.model, messages: messages }),
            signal: signal
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json(); let text = d.choices[0].message.content.replace(/```json/gi, '').replace(/```/g, '').trim();
        let f1 = text.search(/[\{\[]/), f2 = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
        if (f1 !== -1 && f2 !== -1) return JSON.parse(text.substring(f1, f2 + 1));
        throw new Error("AI Returned Malformed JSON");
    } catch (err) {
        if (err.name === 'AbortError') {
            throw err;
        }
        if (attempt < config.maxRetries && !forceStopFlag) { 
            let retryTimer;
            const retryDelayPromise = new Promise(r => { retryTimer = setTimeout(r, 2000); });
            const retryCancelPromise = new Promise((_, reject) => {
                if (signal) {
                    signal.addEventListener('abort', () => {
                        clearTimeout(retryTimer);
                        reject(new DOMException('Aborted', 'AbortError'));
                    });
                }
            });
            await Promise.race([retryDelayPromise, retryCancelPromise]);
            return fetchAIResponse(messages, config, attempt + 1, signal); 
        }
        throw err;
    }
}

async function executeBatchLogic(dataToProcess) {
    activeAbortController = new AbortController();
    const config = { 
        baseUrl: document.getElementById('cfgBaseUrl')?.value.trim() || '', 
        apiKey: document.getElementById('cfgApiKey')?.value.trim() || '', 
        model: document.getElementById('cfgModel')?.value.trim() || '', 
        maxWorkers: parseInt(document.getElementById('cfgMaxWorkers')?.value, 10) || 10, 
        maxRetries: parseInt(document.getElementById('cfgMaxRetries')?.value, 10) || 3, 
        delay: parseFloat(document.getElementById('cfgDelay')?.value) || 0, 
        maxChars: parseInt(document.getElementById('cfgMaxChars')?.value, 10) || 20000, 
        system: document.getElementById('cfgSystem')?.value.trim() || '', 
        template: document.getElementById('cfgTemplate')?.value.trim() || '', 
        samples: [] 
    };
    let actS = []; 
    document.querySelectorAll('.sample-item').forEach(el => { 
        if (el.querySelector('.sample-active-toggle').checked) actS.push({ user: el.querySelector('.sample-user').value.trim(), assistant: el.querySelector('.sample-assistant').value.trim() }); 
    });
    config.samples = (document.getElementById('enableRandomSample')?.checked && actS.length > 0) ? actS.sort(() => 0.5 - Math.random()).slice(0, parseInt(document.getElementById('randomSampleCount')?.value, 10) || 1) : actS;

    const uiT = createAITaskBubble(dataToProcess.length);
    let fail = [], sCount = 0, eCount = 0, i = 0;
    
    const worker = async () => {
        while (i < dataToProcess.length && !forceStopFlag) {
            const item = dataToProcess[i++]; 
            try {
                let pt = config.template; 
                headers.forEach((h, idx) => { 
                    if (!h) return; 
                    let v = item.row[idx] !== undefined ? String(item.row[idx]) : '[空]'; 
                    if (v.length > config.maxChars) v = v.substring(0, config.maxChars) + "\n...[截断]"; 
                    pt = pt.split(`{{${h}}}`).join(v); 
                });
                const msgs = []; 
                if (config.system) msgs.push({ role: "system", content: config.system }); 
                config.samples.forEach(s => { msgs.push({ role: "user", content: s.user }); msgs.push({ role: "assistant", content: s.assistant }); }); 
                msgs.push({ role: "user", content: pt });
                
                const res = await fetchAIResponse(msgs, config, 1, activeAbortController.signal); 
                if (forceStopFlag) break;
                completedResults[item.index] = res; sCount++;
                currentRunLogs.push(`ID[${item.index}] SUCCESS`); uiT.updateProgress(sCount, eCount, `Record[${item.index}] Created`);
            } catch (e) {
                if (forceStopFlag || e.name === 'AbortError') {
                    break;
                }
                fail.push({ index: item.index, row: item.row, error: e.message }); eCount++;
                currentRunLogs.push(`ID[${item.index}] FAIL: ${e.message}`); uiT.updateProgress(sCount, eCount, `Record[${item.index}] ${e.message}`, true);
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(config.maxWorkers, dataToProcess.length) }, () => worker()));
    failedTasks = fail;
    activeAbortController = null;
    uiT.finish(forceStopFlag ? `<span class="text-red-500">✋ 执行被强行中止</span>` : `✅ 引擎处理完毕`);
    setTimeout(() => {
        let hTxt = forceStopFlag ? '任务已中止' : '运行结果汇总';
        let btns = sCount>0 ? `<button onclick="exportExcel()" class="btn-action bg-emerald-500 hover:bg-emerald-600 text-white mr-2 shadow-sm"><i class="fa-solid fa-file-excel"></i> 导出 Excel</button><button onclick="exportJSON()" class="btn-action bg-slate-200 hover:bg-slate-300 text-slate-700 mr-2"><i class="fa-solid fa-file-code"></i> JSON</button>`:'';
        if(eCount>0) btns+=`<button onclick="triggerRetry()" class="btn-action bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"><i class="fa-solid fa-rotate-right"></i> 一键重试失败项 (${eCount})</button>`;
        chatArea.insertAdjacentHTML('beforeend', `<div class="chat-msg"><div class="avatar report"><i class="fa-solid fa-clipboard-check"></i></div><div class="bubble border-indigo-100 bg-white shadow-lg"><div class="bubble-header text-indigo-700">Execution Report <span class="font-normal text-[0.65rem] text-slate-400">${new Date().toLocaleTimeString()}</span></div><div class="text-[0.9rem] text-slate-700"><h3 class="font-bold mb-1">${hTxt}</h3><div class="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200"><p class="text-sm mb-2"><strong class="text-emerald-600">${sCount}</strong> 成功 / <strong class="text-red-500">${eCount}</strong> 失败</p><button onclick="showLogsModal()" class="text-xs bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded shadow-sm"><i class="fa-solid fa-rectangle-list"></i> 查看详细执行日志</button></div><div class="mt-3 pt-3 border-t border-slate-100">${btns}</div></div></div></div>`);
        scrollToBottom();
    }, 600);
}

// 主执行按钮
const fabBtn = document.getElementById('fabBtn'), fabIcon = document.getElementById('fabIcon'), fabTooltip = document.getElementById('fabTooltip');
fabBtn.addEventListener('click', async () => {
    if (isRunning) {
        forceStopFlag = true; fabBtn.disabled = true; fabIcon.className = "fa-solid fa-spinner fa-spin";
        if (activeAbortController) {
            activeAbortController.abort();
        }
    } else {
        if (rawExcelData.length === 0) return alert("请先上传并解析数据源文件！");
        
        completedResults = {}; failedTasks = []; currentRunLogs = []; isRunning = true; forceStopFlag = false;
        fabIcon.className = "fa-solid fa-stop"; fabBtn.classList.replace('bg-indigo-600', 'bg-red-500'); fabBtn.classList.replace('hover:bg-indigo-700', 'hover:bg-red-600'); fabTooltip.innerText = "中止任务";
        document.getElementById('systemStatusIndicator').innerHTML = `<i class="fa-solid fa-circle text-indigo-500 text-[0.5rem] align-middle mr-1 animate-pulse"></i> 运行中`;
        
        const sel = document.getElementById('strategySelector');
        const strategyName = sel.options[sel.selectedIndex].text;
        appendUserMessage(`采用策略 <b>[${strategyName}]</b> 执行，队列总计: <b>${rawExcelData.length}</b> 行。`);
        await executeBatchLogic(rawExcelData); 
        cleanupRunState();
    }
});

window.triggerRetry = async function() {
    if (failedTasks.length === 0 || isRunning) return;
    isRunning = true; forceStopFlag = false; fabIcon.className = "fa-solid fa-stop"; fabBtn.classList.replace('bg-indigo-600', 'bg-red-500'); fabBtn.classList.replace('hover:bg-indigo-700', 'hover:bg-red-600');
    document.getElementById('systemStatusIndicator').innerHTML = `<i class="fa-solid fa-circle text-orange-500 text-[0.5rem] align-middle mr-1 animate-pulse"></i> 重载修复中`;
    appendUserMessage(`开始重试 <b>${failedTasks.length}</b> 条失败任务...`);
    await executeBatchLogic(failedTasks.map(f => ({ index: f.index, row: f.row }))); 
    cleanupRunState();
};

function cleanupRunState() {
    isRunning = false; fabBtn.disabled = false; fabIcon.className = "fa-solid fa-play ml-1"; 
    fabBtn.classList.remove('bg-red-500', 'hover:bg-red-600'); fabBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
    fabTooltip.innerText = "开始执行当前策略"; 
    document.getElementById('systemStatusIndicator').innerHTML = `<i class="fa-solid fa-circle text-emerald-500 text-[0.5rem] align-middle mr-1"></i> 空闲`;
}
