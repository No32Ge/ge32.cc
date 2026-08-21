
// ============== 编辑器初始化（挂载到 window） ==============
(function() {
    const { $, esc, lsGet, lsSet, log } = window;

    function getStoredColorEnum() {
        return lsGet(window.LK_COLOR_ENUM, window.DEFAULT_COLOR_ENUM);
    }

    function saveColorEnumFromEditor() {
        if (!window.colorEnumEditor) return;
        try {
            const parsed = JSON.parse(window.colorEnumEditor.getValue());
            if (parsed && typeof parsed === 'object') lsSet(window.LK_COLOR_ENUM, parsed);
        } catch {}
    }

    function initEditors() {
        const mappingContainer = window.mappingContainer;
        const codeContainer = window.codeContainer;
        const colorEnumContainer = window.colorEnumContainer;
        window.mappingEditor = CodeMirror(mappingContainer, {
            value: window.DEFAULT_MAPPING,
            mode: { name: 'javascript', json: true },
            theme: 'material-darker',
            lineNumbers: true,
            tabSize: 2
        });
        window.mappingEditor.setSize('100%', '100px');

        window.colorEnumEditor = CodeMirror(colorEnumContainer, {
            value: JSON.stringify(getStoredColorEnum(), null, 2),
            mode: { name: 'javascript', json: true },
            theme: 'material-darker',
            lineNumbers: true,
            tabSize: 2
        });
        window.colorEnumEditor.setSize('100%', '220px');
        window.colorEnumEditor.on('change', () => {
            saveColorEnumFromEditor();
            window.updateColorUnmappedMini();
        });

        window.codeEditor = CodeMirror(codeContainer, {
            value: window.DEFAULT_CODE,
            mode: 'javascript',
            theme: 'material-darker',
            lineNumbers: true,
            tabSize: 2,
            viewportMargin: Infinity
        });
        window.codeEditor.setSize('100%', '420px');
    }

    window.initEditors = initEditors;
    window.getStoredColorEnum = getStoredColorEnum;
    window.saveColorEnumFromEditor = saveColorEnumFromEditor;
})();
