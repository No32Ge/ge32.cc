
// AI 颜色分类服务，封装 DeepSeek API 调用

/**
 * 调用 AI 进行颜色分类
 * @param {string[]} unmappedColors - 未映射的颜色名称数组
 * @param {string} apiKey - DeepSeek API 密钥
 * @param {string} model - 模型名称
 * @param {string} systemPrompt - 系统提示词
 * @returns {Promise<Array<{key: string, value: string}>>} AI 建议的分类数组
 */
export async function callAI(unmappedColors, apiKey, model, systemPrompt) {
    if (!apiKey) throw new Error('请填写API密钥');
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: unmappedColors.join('\n') }
            ],
            temperature: 0.1,
            max_tokens: 2000
        })
    });
    if (!response.ok) throw new Error(`API错误 ${response.status}`);
    const data = await response.json();
    const match = data.choices[0].message.content.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('未返回JSON数组');
    return JSON.parse(match[0]);
}
