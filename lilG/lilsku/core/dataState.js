
// 中心数据仓库，管理应用运行时状态，并支持发布订阅
export class DataState {
    constructor() {
        // Excel 原始数据
        this.workbook = null;
        this.currentSheetName = '';
        this.rawDataRows = [];
        this.allColumns = [];

        // 处理后的数据
        this.processedData = [];

        // 上一次去重添加的列名
        this.lastDedupColName = '';

        // 当前方案名称
        this.currentConfigName = '默认方案';

        // 监听器
        this._listeners = {};
    }

    on(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);
    }

    emit(event, ...args) {
        (this._listeners[event] || []).forEach(cb => cb(...args));
    }

    setRawData(workbook, sheetName, rows, columns) {
        this.workbook = workbook;
        this.currentSheetName = sheetName;
        this.rawDataRows = rows;
        this.allColumns = columns;
        this.processedData = [];
        this.lastDedupColName = '';
        this.emit('rawDataLoaded', { workbook, sheetName, rows, columns });
    }

    setProcessedData(data) {
        this.processedData = data;
        this.lastDedupColName = '';
        this.emit('dataProcessed', data);
    }

    updateProcessedData(newData) {
        this.processedData = newData;
        this.emit('dataUpdated', newData);
    }

    setLastDedupColName(colName) {
        this.lastDedupColName = colName;
    }

    // 获取所有可用列（原始列 + 处理后新增列）
    getAllAvailableColumns() {
        const cols = new Set(this.allColumns);
        if (this.processedData.length > 0) {
            Object.keys(this.processedData[0]).forEach(k => {
                if (!k.startsWith('_')) cols.add(k);
            });
        }
        return Array.from(cols);
    }
}

// 单例模式，其他模块导入此实例
export const store = new DataState();
