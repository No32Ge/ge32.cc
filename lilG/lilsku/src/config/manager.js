
import { lsGet, lsSet } from '../utils/storage.js';
import { log } from '../utils/log.js';
import { esc } from '../utils/dom.js';
import { DEFAULT_MAPPING, DEFAULT_CODE, DEFAULT_COLOR_ENUM, DEFAULT_DEDUP_FIELDS } from '../defaults.js';

export const LK_COLOR_ENUM = 'color_enum_config_fusion';
export const LK_AI_KEY = 'color_ai_api_key_fusion';
export const LK_AI_MODEL = 'color_ai_model_fusion';
export const LK_AI_PROMPT = 'color_ai_prompt_fusion';
export const LK_COLOR_COLLAPSED = 'color_enum_collapsed_fusion';
export const LK_AI_COLLAPSED = 'color_ai_collapsed_fusion';
export const LK_MAPPING_COLLAPSED = 'mapping_editor_collapsed_fusion';
export const LK_CODE_COLLAPSED = 'code_editor_collapsed_fusion';
export const LK_CONFIGS = 'variant_gen_configs_fusion_v3';
export const LK_DEDUP_COLLAPSED = 'color_dedup_collapsed_fusion';
export const LK_DEDUP_FIELDS = 'color_dedup_fields_fusion';

export function loadConfigs() { return lsGet(LK_CONFIGS, []); }
export function saveConfigs(configs) { lsSet(LK_CONFIGS, configs); }

export function getCurrentFullConfig(skuColSelect, parentColSelect, mappingEditor, codeEditor, colorEnumEditor, dedupFields) {
    return {
        name: '未命名', // 调用者设置
        skuColumn: skuColSelect.value,
        parentSkuColumn: parentColSelect.value,
        mapping: mappingEditor ? mappingEditor.getValue() : DEFAULT_MAPPING,
        code: codeEditor ? codeEditor.getValue() : DEFAULT_CODE,
        colorEnum: colorEnumEditor ? colorEnumEditor.getValue() : JSON.stringify(DEFAULT_COLOR_ENUM, null, 2),
        dedupFields: dedupFields
    };
}

export function applyConfig(cfg, allColumns, skuColSelect, parentColSelect, mappingEditor, codeEditor, colorEnumEditor, saveColorEnumFromEditor, dedupFieldsUI, updateDedupDatalist, updateDedupFieldHints, updateDedupReadyStatus) {
    if (cfg.skuColumn && allColumns.includes(cfg.skuColumn)) skuColSelect.value = cfg.skuColumn;
    if (cfg.parentSkuColumn && allColumns.includes(cfg.parentSkuColumn)) parentColSelect.value = cfg.parentSkuColumn;
    if (mappingEditor && cfg.mapping) mappingEditor.setValue(cfg.mapping);
    if (codeEditor && cfg.code) codeEditor.setValue(cfg.code);
    if (colorEnumEditor && cfg.colorEnum) { colorEnumEditor.setValue(cfg.colorEnum); if (saveColorEnumFromEditor) saveColorEnumFromEditor(); }
    if (cfg.dedupFields && dedupFieldsUI) {
        dedupFieldsUI.colorType.value = cfg.dedupFields.colorType || '';
        dedupFieldsUI.group.value = cfg.dedupFields.variantGroup || '';
        dedupFieldsUI.color.value = cfg.dedupFields.amazonColor || '';
        dedupFieldsUI.sku.value = cfg.dedupFields.sku || '';
        dedupFieldsUI.newCol.value = cfg.dedupFields.newColName || '去重后颜色';
        // 调用保存方法（由调用者处理）
    }
    if (updateDedupDatalist) updateDedupDatalist();
    if (updateDedupFieldHints) updateDedupFieldHints();
    if (updateDedupReadyStatus) updateDedupReadyStatus();
}

export function renderConfigList(configListContainer, loadConfigs, applyConfig, log) {
    const configs = loadConfigs();
    if (!configs.length) { configListContainer.innerHTML = '<span class="text-gray-500 text-sm">暂无方案</span>'; return; }
    configListContainer.innerHTML = configs.map((c, i) => `
        <div class="bg-white/5 border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 text-sm">
            <span>📋 ${esc(c.name)}</span>
            <button class="text-blue-400 hover:text-blue-300" data-apply="${i}">应用</button>
            <button class="text-red-400 hover:text-red-300" data-delete="${i}">删除</button>
        </div>`).join('');
    configListContainer.querySelectorAll('[data-apply]').forEach(b => b.addEventListener('click', e => {
        const cfgs = loadConfigs();
        applyConfig(cfgs[e.target.dataset.apply]);
        log('方案已应用', 'success');
    }));
    configListContainer.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', e => {
        const cfgs = loadConfigs();
        cfgs.splice(e.target.dataset.delete, 1);
        saveConfigs(cfgs);
        renderConfigList(configListContainer, loadConfigs, applyConfig, log);
    }));
}
