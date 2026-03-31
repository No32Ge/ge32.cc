// ==UserScript==
// @name         Walmart Seller Center - US Time Zones (Spaceship HUD Theme)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  在 seller.walmart.com 显示美国主要时区时间（飞船仪表盘风格，含SVG图标、网格、扫描线）
// @author       Assistant
// @match        *://seller.walmart.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=walmart.com
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ---------- 配置 ----------
    const timezones = [
        { label: 'ZONE_ET (东部)', tz: 'America/New_York' },
        { label: 'ZONE_CT (中部)', tz: 'America/Chicago' },
        { label: 'ZONE_MT (山地)', tz: 'America/Denver' },
        { label: 'ZONE_PT (太平洋)', tz: 'America/Los_Angeles' },
        { label: 'ZONE_AKT(阿拉斯加)', tz: 'America/Anchorage' },
        { label: 'ZONE_HST(夏威夷)', tz: 'Pacific/Honolulu' }
    ];

    const STORAGE_KEY = 'wmt_timezone_panel_hud';
    const COLLAPSED_KEY = 'wmt_timezone_collapsed_hud';

    let panel = null;
    let timer = null;
    let timeElements = [];
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let panelStartLeft = 0, panelStartTop = 0;

    // ---------- SVG 资产 ----------
    const SVGS = {
        radar: `<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v10l4.5 4.5"/><path d="M12 12 22 12"/><circle cx="12" cy="12" r="2"/></svg>`,
        reset: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
        collapse: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 12 6 20 14"/></svg>`,
        expand: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 10 12 18 20 10"/></svg>`
    };

    // ---------- 注入 HUD 样式 ----------
    function injectStyles() {
        if (document.getElementById('wmt-hud-style')) return;
        const style = document.createElement('style');
        style.id = 'wmt-hud-style';
        style.textContent = `
            /* 主面板容器 */
            #wmt-timezones-panel {
                position: fixed;
                z-index: 9999;
                background-color: rgba(6, 10, 15, 0.95);
                /* SVG网格背景 */
                background-image: 
                    linear-gradient(rgba(0, 240, 255, 0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 240, 255, 0.05) 1px, transparent 1px);
                background-size: 15px 15px;
                border: 1px solid #0f2c3b;
                border-top: 2px solid #00f0ff; /* 顶部高亮边条 */
                border-bottom: 2px solid #00f0ff;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), inset 0 0 15px rgba(0, 240, 255, 0.08);
                font-family: 'Consolas', 'Courier New', monospace;
                font-size: 12px;
                color: #8da9b8;
                min-width: 250px;
                overflow: hidden;
                border-radius: 2px;
            }
            /* 扫描线遮罩特效 */
            #wmt-timezones-panel::after {
                content: "";
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
                background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
                background-size: 100% 4px;
                pointer-events: none;
                z-index: 10;
            }
            /* 状态指示灯闪烁 */
            @keyframes hud-blink {
                0%, 100% { opacity: 1; text-shadow: 0 0 8px #00f0ff; }
                50% { opacity: 0.4; text-shadow: none; }
            }
            .hud-indicator {
                width: 6px; height: 6px;
                background-color: #00f0ff;
                border-radius: 50%;
                display: inline-block;
                box-shadow: 0 0 5px #00f0ff;
                animation: hud-blink 2s infinite;
            }
            /* 控制按钮悬停反馈 */
            .hud-btn {
                cursor: pointer;
                color: #5c7b8b;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .hud-btn:hover {
                color: #ff9d00; /* 警示橙 */
                filter: drop-shadow(0 0 4px #ff9d00);
            }
            /* 文本高亮 */
            .hud-value {
                color: #00f0ff;
                font-weight: bold;
                letter-spacing: 0.5px;
                text-shadow: 0 0 6px rgba(0, 240, 255, 0.4);
            }
            /* 排版连线 */
            .hud-leader {
                flex-grow: 1;
                border-bottom: 1px dashed #1d3b4a;
                margin: 0 8px;
                position: relative;
                top: -4px;
            }
        `;
        document.head.appendChild(style);
    }

    // ---------- 辅助函数 ----------
    function getCurrentTimeForZone(timeZone) {
        try {
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timeZone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
            return formatter.format(now);
        } catch (e) {
            return '--:--:-- --';
        }
    }

    function updateTimes() {
        if (!panel) return;
        for (let i = 0; i < timezones.length; i++) {
            const tz = timezones[i].tz;
            const timeStr = getCurrentTimeForZone(tz);
            if (timeElements[i]) {
                timeElements[i].textContent = timeStr;
            }
        }
    }

    function startTimer() {
        if (timer) clearInterval(timer);
        updateTimes();
        timer = setInterval(updateTimes, 1000);
    }

    function stopTimer() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }

    function savePanelPosition(left, top) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, top }));
    }

    function saveCollapsedState(isCollapsed) {
        localStorage.setItem(COLLAPSED_KEY, isCollapsed ? 'true' : 'false');
    }

    function getCollapsedState() {
        return localStorage.getItem(COLLAPSED_KEY) === 'true';
    }

    function getSavedPosition() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try { return JSON.parse(saved); } catch(e) {}
        }
        return null;
    }

    function constrainPanelBounds(panelEl, left, top) {
        const rect = panelEl.getBoundingClientRect();
        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;
        let newLeft = left;
        let newTop = top;
        if (newLeft + rect.width > winWidth) newLeft = winWidth - rect.width - 5;
        if (newLeft < 5) newLeft = 5;
        if (newTop + rect.height > winHeight) newTop = winHeight - rect.height - 5;
        if (newTop < 5) newTop = 5;
        return { left: newLeft, top: newTop };
    }

    function applyPanelPosition(panelEl, left, top) {
        panelEl.style.left = left + 'px';
        panelEl.style.top = top + 'px';
        panelEl.style.right = 'auto';
        panelEl.style.bottom = 'auto';
    }

    function setInitialPosition(panelEl) {
        const savedPos = getSavedPosition();
        if (savedPos && typeof savedPos.left === 'number' && typeof savedPos.top === 'number') {
            const constrained = constrainPanelBounds(panelEl, savedPos.left, savedPos.top);
            applyPanelPosition(panelEl, constrained.left, constrained.top);
        } else {
            panelEl.style.right = '20px';
            panelEl.style.bottom = '20px';
            panelEl.style.left = 'auto';
            panelEl.style.top = 'auto';
        }
    }

    function initDrag(panelEl, headerEl) {
        headerEl.style.cursor = 'move';
        headerEl.style.userSelect = 'none';

        const onMouseMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            let newLeft = panelStartLeft + (e.clientX - dragStartX);
            let newTop = panelStartTop + (e.clientY - dragStartY);
            const constrained = constrainPanelBounds(panelEl, newLeft, newTop);
            applyPanelPosition(panelEl, constrained.left, constrained.top);
            savePanelPosition(constrained.left, constrained.top);
        };

        const onMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.userSelect = '';
        };

        headerEl.addEventListener('mousedown', (e) => {
            if (e.target.closest('.hud-btn')) return;
            e.preventDefault();
            isDragging = true;
            const rect = panelEl.getBoundingClientRect();
            panelStartLeft = rect.left;
            panelStartTop = rect.top;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    function initCollapse(panelEl, contentEl, headerControlsEl) {
        let isCollapsed = getCollapsedState();
        const collapseBtn = document.createElement('div');
        collapseBtn.className = 'hud-btn';
        collapseBtn.title = '展开/折叠';
        collapseBtn.innerHTML = isCollapsed ? SVGS.expand : SVGS.collapse;
        
        // 插入到重置按钮之前
        headerControlsEl.insertBefore(collapseBtn, headerControlsEl.firstChild);

        function setCollapsed(collapsed) {
            isCollapsed = collapsed;
            contentEl.style.display = collapsed ? 'none' : 'block';
            collapseBtn.innerHTML = collapsed ? SVGS.expand : SVGS.collapse;
            saveCollapsedState(collapsed);
        }

        setCollapsed(isCollapsed);

        collapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setCollapsed(!isCollapsed);
        });
    }

    // ---------- 创建面板DOM ----------
    function createPanelDOM() {
        if (panel && panel.parentNode) panel.parentNode.removeChild(panel);

        const container = document.createElement('div');
        container.id = 'wmt-timezones-panel';

        // 标题栏 (HUD Header)
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 8px 12px;
            background: linear-gradient(90deg, #091a26, rgba(6, 10, 15, 0.5));
            border-bottom: 1px solid #0f2c3b;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
            z-index: 20;
        `;
        
        // 标题左侧组
        const titleWrapper = document.createElement('div');
        titleWrapper.style.cssText = 'display: flex; align-items: center; gap: 8px; color: #00f0ff;';
        
        // 闪烁点
        const indicator = document.createElement('span');
        indicator.className = 'hud-indicator';
        
        // 雷达图标
        const titleIcon = document.createElement('div');
        titleIcon.style.display = 'flex';
        titleIcon.innerHTML = SVGS.radar;

        // 标题文字
        const titleText = document.createElement('span');
        titleText.textContent = 'SYS.CHRONO.SYNC';
        titleText.style.fontWeight = 'bold';
        titleText.style.letterSpacing = '1px';
        
        titleWrapper.appendChild(indicator);
        titleWrapper.appendChild(titleIcon);
        titleWrapper.appendChild(titleText);

        // 标题右侧控制组
        const controlsWrapper = document.createElement('div');
        controlsWrapper.style.cssText = 'display: flex; gap: 10px; align-items: center;';

        // 重置按钮
        const resetBtn = document.createElement('div');
        resetBtn.className = 'hud-btn';
        resetBtn.title = '重置位置 (RESET POS)';
        resetBtn.innerHTML = SVGS.reset;
        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            container.style.right = '20px';
            container.style.bottom = '20px';
            container.style.left = 'auto';
            container.style.top = 'auto';
            localStorage.removeItem(STORAGE_KEY);
        });
        
        controlsWrapper.appendChild(resetBtn);
        
        header.appendChild(titleWrapper);
        header.appendChild(controlsWrapper);

        // 内容区域
        const content = document.createElement('div');
        content.style.cssText = 'padding: 12px; position: relative; z-index: 20;';

        const listContainer = document.createElement('div');
        listContainer.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

        timeElements = [];
        for (let i = 0; i < timezones.length; i++) {
            const tzInfo = timezones[i];
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; justify-content: space-between; align-items: baseline;';
            
            // 标签 (如: ZONE_ET)
            const labelSpan = document.createElement('span');
            labelSpan.textContent = tzInfo.label;
            
            // 排版连线 (.......虚线)
            const leader = document.createElement('div');
            leader.className = 'hud-leader';

            // 时间值容器
            const timeWrapper = document.createElement('span');
            timeWrapper.style.color = '#456a7d'; // 括号颜色
            
            const bracketLeft = document.createTextNode('[ ');
            const bracketRight = document.createTextNode(' ]');

            const timeSpan = document.createElement('span');
            timeSpan.className = 'hud-value';
            timeSpan.textContent = '--:--:-- --';
            
            timeWrapper.appendChild(bracketLeft);
            timeWrapper.appendChild(timeSpan);
            timeWrapper.appendChild(bracketRight);
            
            row.appendChild(labelSpan);
            row.appendChild(leader);
            row.appendChild(timeWrapper);
            listContainer.appendChild(row);
            
            timeElements.push(timeSpan);
        }

        content.appendChild(listContainer);
        container.appendChild(header);
        container.appendChild(content);

        // 初始化交互
        initCollapse(container, content, controlsWrapper);
        initDrag(container, header);

        return container;
    }

    function injectPanel() {
        if (panel) {
            if (!document.body.contains(panel)) {
                document.body.appendChild(panel);
                setInitialPosition(panel);
            }
            return;
        }
        panel = createPanelDOM();
        document.body.appendChild(panel);
        setInitialPosition(panel);
        startTimer();
    }

    function ensurePanelExists() {
        if (!panel || !document.body.contains(panel)) {
            if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
            panel = createPanelDOM();
            document.body.appendChild(panel);
            setInitialPosition(panel);
            if (!timer) startTimer();
        }
    }

    function startMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                    if (panel && !document.body.contains(panel)) {
                        ensurePanelExists();
                        break;
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: false });
    }

    window.addEventListener('beforeunload', () => {
        stopTimer();
    });

    function init() {
        injectStyles(); // 注入HUD科技CSS
        if (document.body) {
            injectPanel();
            startMutationObserver();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                injectPanel();
                startMutationObserver();
            });
        }
    }

    init();
})();
