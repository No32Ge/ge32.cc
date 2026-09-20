// presets-manifest.js
// 仅维护规则模版的路径索引，点击前不会加载任何实际映射 JSON
window.__EXECLINE_PRESET_INDEX__ = [
    {
        id: 'tpl_tiktok',
        name: 'TikTok 美区达人建联表',
        desc: '包含达人ID、佣金率、出单SKU等预设字段',
        // 实际的大体积 JSON 路径（占位符）
        url: 'https://YOUR_DOMAIN_OR_CDN_PATH/rules/tiktok-creator-rules.json'
    },
    {
        id: 'tpl_shopee',
        name: 'Shopee 跨境上架标准模版',
        desc: '映射类目属性、多变体与双币种字段',
        url: 'https://YOUR_DOMAIN_OR_CDN_PATH/rules/shopee-standard-rules.json'
    },
    {
        id: 'tpl_amazon',
        name: 'Amazon FBA 发货单转换规则',
        desc: '箱规、SKU条码、装箱明细格式',
        url: 'https://YOUR_DOMAIN_OR_CDN_PATH/rules/amazon-fba-rules.json'
    }
];