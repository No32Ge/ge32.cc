
// ================= 全局系统状态 =================
let rawExcelData = [], headers = [], completedResults = {}, failedTasks = [], currentRunLogs = [];
let isRunning = false, forceStopFlag = false;

// 聊天区域引用（由 ui.js 使用）
const chatArea = document.getElementById('chatArea');

// 焦点模式状态
let isFocusMode = false;
let currentFocus = 'center'; // 'left', 'center', 'right'

// 策略存储相关全局变量
let currentStrategies = [], activeStrategyId = null, isSyncingUI = false, saveTimeout = null;
const STORE_KEY = 'Alchemist_V7';

// 初始化入口
window.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    appendSystemMessage("Alchemist 工作台 v7.0 (Pristine Flow 纯净版) 初始化完毕。<br><br>💡 特性：<br>1. 点击顶部 <strong>FOCUS MODE</strong> 即可开启聚焦流，点击侧边失焦卡片瞬间缩放切换。<br>2. 采用自动化 LocalStorage 持久化存储引擎，所有策略配置安全落盘。<br>3. 全局设置（导入、导出配置与重置）请点击右侧面板顶部的 <i class='fa-solid fa-gear'></i> 齿轮图标进行管理。");
});
