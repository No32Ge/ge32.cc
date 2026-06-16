
import { log, showToast } from '../utils/log.js';
import { esc } from '../utils/dom.js';
import { DEFAULT_AI_PROMPT } from '../defaults.js';

export async function callAI(unmapped, apiKey, model, prompt) {
    const key = apiKey.trim();
    if (!key) { alert('请填写API密钥'); return null; }
    try {
        const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'system', content: prompt.trim() || DEFAULT_AI_PROMPT }, { role: 'user', content: unmapped.join('\n') }],
                temperature: 0.1,
                max_tokens: 2000
            })
        });
        if (!res.ok) throw new Error(`API错误 ${res.status}`);
        const data = await res.json();
        const match = data.choices[0].message.content.match(/\[[\s\S]*\]/);
        if (!match) throw new Error('未返回JSON');
        return JSON.parse(match[0]);
    } catch (e) {
        alert('AI分类失败: ' + e.message);
        return null;
    }
}

export function showAISuggestions(suggestions, aiModalContainer, colorEnumEditor, saveColorEnumFromEditor, updateColorUnmappedMini, log) {
    aiModalContainer.innerHTML = '';
    const overlay = document.createElement('div');
    overlay.className = 'ai-modal-overlay';
    overlay.innerHTML = `
        <div class="ai-modal">
            <h3 class="text-xl font-bold mb-3"><i class="fa-solid fa-robot text-purple-400"></i> AI建议</h3>
            <div class="max-h-60 overflow-y-auto mb-4">${suggestions.map(s => `<div class="ai-suggestion-item"><span>${esc(s.value)} → <b class="text-green-400">${esc(s.key)}</b></span></div>`).join('')}</div>
            <div class="flex justify-end gap-3"><button class="btn-glass" id="aiCancelBtn">取消</button><button class="btn-glass btn-primary" id="aiApplyBtn"><i class="fa-solid fa-check"></i> 应用</button></div>
        </div>`;
    aiModalContainer.appendChild(overlay);
    const close = () => aiModalContainer.innerHTML = '';
    document.getElementById('aiCancelBtn').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.getElementById('aiApplyBtn').addEventListener('click', () => {
        try {
            let cfg = JSON.parse(colorEnumEditor.getValue());
            suggestions.forEach(({ key, value }) => {
                if (!key || !value) return;
                if (!cfg[key]) cfg[key] = [];
                if (!cfg[key].includes(value)) cfg[key].push(value);
            });
            colorEnumEditor.setValue(JSON.stringify(cfg, null, 2));
            saveColorEnumFromEditor();
            updateColorUnmappedMini();
            close();
            log('✅ AI建议已应用', 'success');
        } catch (e) { alert('合并失败'); }
    });
}
