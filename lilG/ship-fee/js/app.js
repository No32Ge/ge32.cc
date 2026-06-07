/* ============================================ */
/* 运费促销策略配置中台 - Vue 3 应用逻辑           */
/* ============================================ */

const { createApp, ref, reactive, computed, watch, onMounted } = Vue;
const { ElMessage, ElMessageBox } = ElementPlus;

const app = createApp({
  setup() {
    // ==========================================
    // 响应式状态
    // ==========================================
    const fullscreenLoading = ref(false);
    const tableLoading = ref(false);

    const rawData = ref([]);
    const columns = ref([]);

    // 全局调整
    const globalAdjustType = ref('percent'); // percent | absolute
    const globalAdjustValue = ref(0);
    const promoApplied = ref(false);

    // 分页
    const currentPage = ref(1);
    const pageSize = ref(50);

    // 商店配置
    const STORE_KEY = 'SaaS_Freight_Engine_Configs';
    const storeConfigs = ref({});
    const currentStoreId = ref('');
    const importConfigInput = ref(null); // DOM 引用

    // ==========================================
    // 计算属性
    // ==========================================
    const activeConfig = computed(() => {
      if (!currentStoreId.value || !storeConfigs.value[currentStoreId.value]) {
        return { mapping: { sku: '', price: '' }, freight: [], rules: [] };
      }
      return storeConfigs.value[currentStoreId.value];
    });

    const paginatedData = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value;
      const end = start + pageSize.value;
      return rawData.value.slice(start, end);
    });

    // ==========================================
    // 配置存储管理
    // ==========================================
    const initStoreConfigs = () => {
      try {
        const saved = localStorage.getItem(STORE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);

          // 兼容老数据结构(补充 adjustType 和 adjustValue)
          Object.values(parsed.configs).forEach(config => {
            if (config.rules) {
              config.rules.forEach(rule => {
                if (!rule.adjustType) rule.adjustType = 'percent';
                if (rule.adjustValue === undefined) rule.adjustValue = 0;
              });
            }
          });

          storeConfigs.value = parsed.configs;
          currentStoreId.value = parsed.activeId;
        } else {
          createDefaultStore();
        }
      } catch (e) {
        createDefaultStore();
      }
      if (!storeConfigs.value[currentStoreId.value]) {
        currentStoreId.value = Object.keys(storeConfigs.value)[0];
      }
    };

    const createDefaultStore = () => {
      const id = 'store_default';
      storeConfigs.value = {
        [id]: { name: '通用主店铺配置', mapping: { sku: '', price: '' }, freight: [], rules: [] }
      };
      currentStoreId.value = id;
    };

    const saveConfig = () => {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        activeId: currentStoreId.value,
        configs: storeConfigs.value
      }));
      ElMessage.success({ message: '策略配置已成功持久化', duration: 2000 });
    };

    const exportStoreConfig = () => {
      const dataStr = JSON.stringify(storeConfigs.value, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SaaS_策略配置备份_${new Date().getTime()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      ElMessage.success('系统策略配置已导出');
    };

    const triggerImportConfig = () => {
      if (importConfigInput.value) {
        importConfigInput.value.click();
      }
    };

    const handleImportConfig = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (typeof data !== 'object') throw new Error();

          let importedCount = 0;
          Object.keys(data).forEach(key => {
            const config = data[key];
            if (config && config.name && config.rules) {
              config.rules.forEach(rule => {
                if (!rule.adjustType) rule.adjustType = 'percent';
                if (rule.adjustValue === undefined) rule.adjustValue = 0;
              });
              storeConfigs.value[key] = config;
              importedCount++;
            }
          });
          saveConfig();
          if (importedCount > 0) {
            ElMessage.success(`成功导入 ${importedCount} 套环境配置`);
          } else {
            ElMessage.warning('未能从文件中识别出有效配置');
          }
        } catch (err) {
          ElMessage.error('无效的配置文件格式');
        } finally {
          e.target.value = null;
        }
      };
      reader.readAsText(file);
    };

    const createNewStore = () => {
      ElMessageBox.prompt('请输入新配置名称', '创建环境配置', {
        confirmButtonText: '确定创建',
        cancelButtonText: '取消',
        inputPattern: /\S+/,
        inputErrorMessage: '名称不能为空'
      }).then(({ value }) => {
        const id = 'store_' + Date.now();
        storeConfigs.value[id] = { name: value, mapping: { sku: '', price: '' }, freight: [], rules: [] };
        currentStoreId.value = id;
        saveConfig();
      }).catch(() => {});
    };

    const handleStoreCommand = (command) => {
      if (command === 'rename') {
        ElMessageBox.prompt('请输入新的配置名称', '重命名配置', {
          inputValue: storeConfigs.value[currentStoreId.value].name,
          confirmButtonText: '保存',
          cancelButtonText: '取消',
        }).then(({ value }) => {
          if (value.trim()) {
            storeConfigs.value[currentStoreId.value].name = value.trim();
            saveConfig();
          }
        }).catch(() => {});
      } else if (command === 'delete') {
        if (Object.keys(storeConfigs.value).length <= 1) {
          return ElMessage.warning('系统需要至少保留一套基础环境配置。');
        }
        ElMessageBox.confirm('危险操作：确定要删除当前环境配置及其所有规则吗？', '系统警告', {
          confirmButtonText: '强制删除',
          cancelButtonText: '取消',
          type: 'error',
        }).then(() => {
          delete storeConfigs.value[currentStoreId.value];
          currentStoreId.value = Object.keys(storeConfigs.value)[0];
          saveConfig();
          ElMessage.success('配置已彻底删除');
        }).catch(() => {});
      }
    };

    const handleStoreChange = () => {
      promoApplied.value = false;
      saveConfig();
      ElMessage.info(`工作区已切换至：${activeConfig.value.name}`);
    };

    // ==========================================
    // 基础运费模板操作
    // ==========================================
    const addFreightTpl = () => {
      activeConfig.value.freight.push({ id: `TPL-${activeConfig.value.freight.length + 1}`, price: 0 });
    };

    const removeFreightTpl = (index) => {
      activeConfig.value.freight.splice(index, 1);
    };

    // ==========================================
    // 促销规则操作
    // ==========================================
    const addPromoRule = () => {
      activeConfig.value.rules.push({
        min: 0, max: 0, templateId: '', adjustType: 'percent', adjustValue: 0
      });
    };

    const removePromoRule = (index) => {
      activeConfig.value.rules.splice(index, 1);
    };

    const calculateExample = (rule) => {
      if (rule.max <= 0 || !rule.templateId) return '—';
      const tpl = activeConfig.value.freight.find(f => f.id === rule.templateId);
      if (!tpl) return '—';

      let targetPrice = rule.max;
      if (rule.adjustType === 'percent') {
        targetPrice = targetPrice * (1 + (rule.adjustValue || 0) / 100);
      } else {
        targetPrice = targetPrice + (rule.adjustValue || 0);
      }

      return Math.max(0, targetPrice - tpl.price).toFixed(2);
    };

    // ==========================================
    // 数据导入与解析
    // ==========================================
    const handleFileUpload = (file) => {
      fullscreenLoading.value = true;
      const rawFile = file.raw;

      if (rawFile.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = e => {
          try {
            const d = JSON.parse(e.target.result);
            if (Array.isArray(d) && d.length) setupData(d);
            else throw new Error('JSON数据为空或格式不对');
          } catch (err) {
            ElMessage.error('JSON 文件解析失败');
          } finally {
            fullscreenLoading.value = false;
          }
        };
        reader.readAsText(rawFile);
      } else {
        const reader = new FileReader();
        reader.onload = e => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            if (json.length > 0) setupData(json);
            else throw new Error('表格为空');
          } catch (err) {
            ElMessage.error('Excel 文件解析失败');
          } finally {
            fullscreenLoading.value = false;
          }
        };
        reader.readAsArrayBuffer(rawFile);
      }
    };

    const setupData = (data) => {
      columns.value = Object.keys(data[0]);
      rawData.value = data.map(item => ({ ...item }));
      currentPage.value = 1;
      promoApplied.value = false;

      if (!columns.value.includes(activeConfig.value.mapping.sku)) activeConfig.value.mapping.sku = '';
      if (!columns.value.includes(activeConfig.value.mapping.price)) activeConfig.value.mapping.price = '';

      ElMessage.success(`成功导入业务数据：共 ${data.length} 条记录`);
    };

    const clearData = () => {
      ElMessageBox.confirm('将清空当前表格内所有源数据，确认操作？', '提示', { type: 'warning' })
        .then(() => {
          rawData.value = [];
          columns.value = [];
          promoApplied.value = false;
        }).catch(() => {});
    };

    // ==========================================
    // 全局价格调整
    // ==========================================
    const applyGlobalAdjust = () => {
      if (!rawData.value.length) return ElMessage.warning('请先导入业务数据');
      const priceField = activeConfig.value.mapping.price;
      if (!priceField) return ElMessage.error('错误：请先指定【原售价】对应的字段映射');

      const adjustVal = globalAdjustValue.value;
      if (adjustVal !== 0) {
        tableLoading.value = true;
        setTimeout(() => {
          rawData.value.forEach(row => {
            const currentVal = parseFloat(row[priceField]) || 0;
            if (globalAdjustType.value === 'percent') {
              row[priceField] = (currentVal * (1 + adjustVal / 100)).toFixed(2);
            } else {
              row[priceField] = (currentVal + adjustVal).toFixed(2);
            }
          });
          globalAdjustValue.value = 0;
          promoApplied.value = false;
          tableLoading.value = false;
          ElMessage.success('全局价格已调整完毕');
        }, 300);
      }
    };

    // ==========================================
    // 策略引擎核心逻辑
    // ==========================================
    const runEngine = () => {
      if (!rawData.value.length) return ElMessage.warning('引擎异常：没有可以处理的数据节点');
      const priceField = activeConfig.value.mapping.price;
      if (!priceField) return ElMessage.error('引擎异常：未指定核心运算字段【原售价】');
      if (activeConfig.value.rules.length === 0) return ElMessage.warning('引擎提示：未配置任何促销区间策略');

      tableLoading.value = true;

      const tplMap = {};
      activeConfig.value.freight.forEach(t => { tplMap[t.id] = t.price; });

      setTimeout(() => {
        rawData.value.forEach(row => {
          const originPrice = parseFloat(row[priceField]) || 0;
          row._totalPrice = originPrice;

          let matched = false;
          for (let rule of activeConfig.value.rules) {
            if (originPrice >= rule.min && originPrice <= rule.max && rule.templateId) {
              // 1. 分段价格调节
              let adjustedPrice = originPrice;
              if (rule.adjustType === 'percent') {
                adjustedPrice = originPrice * (1 + (rule.adjustValue || 0) / 100);
              } else {
                adjustedPrice = originPrice + (rule.adjustValue || 0);
              }

              // 2. 扣减运费
              const freight = tplMap[rule.templateId] || 0;
              row._salesPrice = Math.max(0, adjustedPrice - freight);
              row._promoFreight = freight;
              row._promoTemplateId = rule.templateId;
              row._promoApplied = true;
              matched = true;
              break;
            }
          }

          if (!matched) {
            row._salesPrice = originPrice;
            row._promoFreight = 0;
            row._promoTemplateId = '';
            row._promoApplied = false;
          }
        });

        promoApplied.value = true;
        tableLoading.value = false;
        ElMessage.success('策略引擎执行完毕，已完成全部数据覆写与倒推运算');
      }, 500);
    };

    // ==========================================
    // 导出 Excel
    // ==========================================
    const exportExcel = () => {
      if (!rawData.value.length) return;
      const exportData = rawData.value.map(r => {
        const out = { ...r };
        delete out._totalPrice;
        delete out._salesPrice;
        delete out._promoFreight;
        delete out._promoTemplateId;
        delete out._promoApplied;

        out['策略_原总价参考'] = r._totalPrice;
        out['策略_系统计算最终售价'] = r._salesPrice;
        out['策略_匹配运费'] = r._promoFreight;
        out['策略_命中模板ID'] = r._promoTemplateId || '未命中';
        out['策略_状态'] = r._promoApplied ? '生效' : '原始';
        return out;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '策略运算结果集');
      XLSX.writeFile(wb, `策略引擎_输出报表_${new Date().getTime()}.xlsx`);
    };

    // ==========================================
    // 生命周期
    // ==========================================
    onMounted(() => {
      initStoreConfigs();
    });

    // ==========================================
    // 导出模板/方法
    // ==========================================
    return {
      fullscreenLoading,
      tableLoading,
      rawData,
      columns,
      promoApplied,
      globalAdjustType,
      globalAdjustValue,
      currentPage,
      pageSize,
      paginatedData,
      storeConfigs,
      currentStoreId,
      activeConfig,
      importConfigInput,
      handleStoreChange,
      handleStoreCommand,
      createNewStore,
      saveConfig,
      exportStoreConfig,
      triggerImportConfig,
      handleImportConfig,
      addFreightTpl,
      removeFreightTpl,
      addPromoRule,
      removePromoRule,
      calculateExample,
      handleFileUpload,
      clearData,
      applyGlobalAdjust,
      runEngine,
      exportExcel
    };
  }
});

// ============================================
// 注册 Element Plus Icons
// ============================================
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(ElementPlus);
app.mount('#app');
