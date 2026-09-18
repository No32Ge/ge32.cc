/**
 * Alchemist Dynamic Dashboard Card Engine v2
 * 路径: /alch/dashboard-card/v2/card-engine.js
 * 功能: 状态检测、自动量取高度、静默一键注册、本地备份容灾与父子窗口通信
 */
(function() {
    // 独立存储字段，避免与其他业务键名冲突
    const BACKUP_KEY_FIELD = 'alc_backup_registered_access_key';

    // 运行时上下文
    let currentContext = {
        accessKey: '',
        relayBaseUrl: 'http://localhost:5000',
        deviceId: ''
    };

    let isRegistering = false;

    // 1. 动态自适应高度通知宿主
    function notifyHeight() {
        setTimeout(function() {
            const container = document.getElementById('widget-container');
            if (container && window.parent && window.parent !== window) {
                window.parent.postMessage({
                    type: 'ALC_IFRAME_RESIZE',
                    payload: { height: container.offsetHeight + 10 }
                }, '*');
            }
        }, 50);
    }

    // 2. 状态视图切换
    function showView(viewId) {
        ['alc-view-loading', 'alc-view-unregistered', 'alc-view-authenticated', 'alc-view-invalid'].forEach(function(id) {
            const el = document.getElementById(id);
            if (el) {
                if (id === viewId) el.classList.add('alc-view-active');
                else el.classList.remove('alc-view-active');
            }
        });
        notifyHeight();
    }

    // 3. 密钥状态校验
    async function recheckKeyState() {
        const key = (currentContext.accessKey || '').trim();

        if (!key) {
            showView('alc-view-unregistered');
            return;
        }

        if (!key.startsWith('alk-') || key.length < 10) {
            const errEl = document.getElementById('invalid-reason-text');
            if (errEl) errEl.textContent = '密钥格式不合法：Alchemist 官方密钥必须以 "alk-" 开头。检测到非规范凭证，请核对后再试。';
            showView('alc-view-invalid');
            return;
        }

        showView('alc-view-loading');

        try {
            const base = (currentContext.relayBaseUrl || 'http://localhost:5000').replace(/\/+$/, '');
            const res = await fetch(base + '/api/v1/key-info', {
                headers: {
                    'Authorization': 'Bearer ' + key,
                    'X-Device-ID': currentContext.deviceId || ''
                }
            });

            if (res.ok) {
                const data = await res.json();
                if (!data.is_active) {
                    const errEl = document.getElementById('invalid-reason-text');
                    if (errEl) errEl.textContent = '此 Access Key 已被系统管理员设为禁用状态，请重新注册新凭据。';
                    showView('alc-view-invalid');
                    return;
                }

                // 渲染尊享数据
                const nameEl = document.getElementById('auth-key-name');
                const valEl = document.getElementById('auth-key-val');
                const creditsEl = document.getElementById('auth-credits');
                const callsEl = document.getElementById('auth-calls');
                const weightEl = document.getElementById('auth-timeweight');

                if (nameEl) nameEl.textContent = data.name || '默认接入端';
                if (valEl) valEl.textContent = data.key_value ? (data.key_value.substring(0, 8) + '***' + data.key_value.slice(-4)) : key;
                if (creditsEl) creditsEl.textContent = Number(data.credits_balance).toLocaleString();
                if (callsEl) callsEl.textContent = Number(data.total_calls || 0).toLocaleString();
                if (weightEl) weightEl.textContent = (data.current_time_weight || 1.0) + 'x';

                showView('alc-view-authenticated');
            } else {
                const errEl = document.getElementById('invalid-reason-text');
                if (errEl) errEl.textContent = '服务器拒绝验证：未找到该密钥记录，请重新一键注册生成有效凭据。';
                showView('alc-view-invalid');
            }
        } catch (err) {
            const errEl = document.getElementById('invalid-reason-text');
            if (errEl) errEl.textContent = '无法连接到 Alchemist 中继服务器进行认证，请检查服务连通性。';
            showView('alc-view-invalid');
        }
    }

    // 4. 核心：静默注册并传出 Key（带限速自动降级到本地备份）
    async function doQuickRegister() {
        if (isRegistering) return;
        isRegistering = true;

        const regBtn = document.getElementById('btnQuickRegister');
        const regText = document.getElementById('reg-btn-text');

        if (regBtn) regBtn.classList.add('opacity-75', 'cursor-not-allowed');
        if (regText) regText.textContent = '正在分配算力凭证...';

        // 确保获取或创建设备 ID
        let devId = currentContext.deviceId;
        if (!devId) {
            devId = localStorage.getItem('alchemist_device_id') || ('dev-' + Math.random().toString(36).substring(2, 15));
            localStorage.setItem('alchemist_device_id', devId);
            currentContext.deviceId = devId;
        }

        const base = (currentContext.relayBaseUrl || 'http://localhost:5000').replace(/\/+$/, '');

        try {
            const res = await fetch(base + '/api/portal/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Device-Id': devId
                },
                body: JSON.stringify({ device_id: devId })
            });

            const data = await res.json().catch(() => ({}));

            // 成功注册
            if (res.ok && data.key_info && data.key_info.key_value) {
                const newKey = data.key_info.key_value;

                // 本地备份字段存一份
                localStorage.setItem(BACKUP_KEY_FIELD, newKey);
                if (data.token) localStorage.setItem('alchemist_portal_token', data.token);

                // 更新当前上下文并传给宿主
                currentContext.accessKey = newKey;
                sendActionToHost('FILL_KEY', { key: newKey });

                notifyToast('🎉 成功领取 100 次算力，凭证已自动激活！', 'success');
                recheckKeyState();
                resetRegisterButton();
                return;
            }

            // 注册未成功（如频繁请求、限速等）：触发本地备份降级
            handleRegisterFailure(data.error || '注册请求频繁');

        } catch (err) {
            handleRegisterFailure(err.message);
        } finally {
            resetRegisterButton();
        }
    }

    // 失败降级：如果已有本地备份，直接透传已有的 Key 激活
    function handleRegisterFailure(reason) {
        const cachedBackupKey = localStorage.getItem(BACKUP_KEY_FIELD);

        if (cachedBackupKey && cachedBackupKey.startsWith('alk-')) {
            currentContext.accessKey = cachedBackupKey;
            sendActionToHost('FILL_KEY', { key: cachedBackupKey });
            notifyToast('操作频繁，已自动恢复此前已生成的有效凭据！', 'info');
            recheckKeyState();
        } else {
            notifyToast('注册遇到问题: ' + reason, 'error');
        }
    }

    function resetRegisterButton() {
        isRegistering = false;
        const regBtn = document.getElementById('btnQuickRegister');
        const regText = document.getElementById('reg-btn-text');
        if (regBtn) regBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        if (regText) regText.textContent = '⚡ 一键免密生成并激活';
    }

    // 5. 宿主指令派发工具
    function sendActionToHost(actionType, extra) {
        extra = extra || {};
        if (!window.parent || window.parent === window) return;

        switch(actionType) {
            case 'LOCATE_KEY':
                window.parent.postMessage({ type: 'ALC_ACTION_LOCATE_KEY' }, '*');
                break;
            case 'CLEAR_KEY':
                window.parent.postMessage({ type: 'ALC_ACTION_CLEAR_KEY' }, '*');
                break;
            case 'FILL_KEY':
                window.parent.postMessage({ type: 'ALC_ACTION_FILL_KEY', payload: { key: extra.key } }, '*');
                break;
            case 'OPEN_PORTAL':
                window.parent.postMessage({ 
                    type: 'ALC_ACTION_OPEN_WINDOW',
                    payload: { 
                        url: 'https://amigray.com/portal/',
                        toastMsg: '已打开管理控制台！'
                    }
                }, '*');
                break;
        }
    }

    function notifyToast(msg, type) {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'ALC_ACTION_TOAST',
                payload: { msg: msg, toastType: type || 'info' }
            }, '*');
        }
    }

    function copyPortalLink() {
        navigator.clipboard.writeText('https://amigray.com/portal/').then(function() {
            notifyToast('备用网址已复制到剪贴板！', 'info');
        });
    }

    // 6. 监听宿主通知
    window.addEventListener('message', function(e) {
        const data = e.data;
        if (!data || data.type !== 'ALC_HOST_SYNC_STATE') return;
        currentContext = Object.assign(currentContext, data.payload || {});
        recheckKeyState();
    });

    // 暴露必要方法给全局 DOM 事件
    window.sendActionToHost = sendActionToHost;
    window.recheckKeyState = recheckKeyState;
    window.alcDoQuickRegister = doQuickRegister;
    window.alcCopyPortalLink = copyPortalLink;

    // 启动握手与初始检查
    window.addEventListener('resize', notifyHeight);
    window.addEventListener('DOMContentLoaded', function() {
        // 从 URL 参数中读取初始 Key/Relay/Code
        const params = new URLSearchParams(window.location.search);
        if (params.get('key')) currentContext.accessKey = params.get('key');
        if (params.get('relay')) currentContext.relayBaseUrl = params.get('relay');
        if (params.get('deviceId')) currentContext.deviceId = params.get('deviceId');

        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'ALC_IFRAME_READY' }, '*');
        }
        recheckKeyState();
    });
})();