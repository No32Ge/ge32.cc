
// 初始化和管理所有 CodeMirror 编辑器实例

let mappingEditor = null;
let colorEnumEditor = null;
let codeEditor = null;

/**
 * 初始化三个编辑器
 * @param {HTMLElement} mappingContainer - 映射编辑器容器
 * @param {HTMLElement} colorEnumContainer - 颜色枚举容器
 * @param {HTMLElement} codeContainer - 处理函数容器
 * @param {Object} initialValues - 初始值 { mapping, colorEnum, code }
 */
export function initEditors(mappingContainer, colorEnumContainer, codeContainer, initialValues) {
    mappingEditor = CodeMirror(mappingContainer, {
        value: initialValues.mapping || '{}',
        mode: { name: 'javascript', json: true },
        theme: 'material-darker',
        lineNumbers: true,
        tabSize: 2
    });
    mappingEditor.setSize('100%', '100px');

    colorEnumEditor = CodeMirror(colorEnumContainer, {
        value: initialValues.colorEnum || '{}',
        mode: { name: 'javascript', json: true },
        theme: 'material-darker',
        lineNumbers: true,
        tabSize: 2
    });
    colorEnumEditor.setSize('100%', '220px');

    codeEditor = CodeMirror(codeContainer, {
        value: initialValues.code || 'return (function() { return []; })',
        mode: 'javascript',
        theme: 'material-darker',
        lineNumbers: true,
        tabSize: 2,
        viewportMargin: Infinity
    });
    codeEditor.setSize('100%', '420px');

    return { mappingEditor, colorEnumEditor, codeEditor };
}

export function getMappingEditor() { return mappingEditor; }
export function getColorEnumEditor() { return colorEnumEditor; }
export function getCodeEditor() { return codeEditor; }

/**
 * 刷新所有编辑器（通常在折叠/全屏动画后调用）
 */
export function refreshEditors() {
    mappingEditor?.refresh();
    colorEnumEditor?.refresh();
    codeEditor?.refresh();
}
