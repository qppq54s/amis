# Select selectFirst 不触发 onChange 调查总结

## 任务完成情况

✅ **已完成所有验收标准：**

1. ✅ 找到 select 组件中 selectFirst 的具体实现代码
2. ✅ 清楚说明为什么自动选中不触发 change 事件
3. ✅ 提供解决方案或建议

## 核心发现

### selectFirst 的实现位置

**主要实现文件和位置：**

1. **formItem.ts (第 662-714 行)** - `setOptions()` 函数
   - 这是 selectFirst 自动选中逻辑的核心实现
   - 当满足条件时，会调用传入的 `onChange` 参数

2. **Options.tsx (第 898-911 行)** - `changeOptionValue()` 函数
   - 这是传给 `setOptions` 的 `onChange` 参数
   - 关键判断：根据 `formInited` 状态决定调用 `setPrinstineValue` 还是 `onChange`

3. **Options.tsx (第 608-629 行)** - `handleToggle()` 函数
   - 用户手动选择时的处理逻辑
   - 会触发 `dispatchEvent('change')` 事件

### 为什么不触发 onChange？

**这是有意设计的行为，核心原因是：**

```typescript
// packages/amis-core/src/renderers/Options.tsx (第 898-911 行)
changeOptionValue(value: any) {
  const { onChange, formInited, setPrinstineValue, value: originValue } = this.props;

  if (formInited === false) {
    // 表单未初始化完成 -> 设置默认值，不触发 onChange
    originValue === undefined && setPrinstineValue?.(value);
  } else {
    // 表单已初始化 -> 触发 onChange 事件
    onChange?.(value);
  }
}
```

**设计理由：**

1. **区分默认值和用户交互**
   - 初始化时设置默认值 → 使用 `setPrinstineValue`
   - 用户手动选择 → 使用 `onChange` + 触发 'change' 事件

2. **符合表单规范**
   - HTML 标准和大多数 UI 框架中，设置默认值不触发 change 事件
   - change 事件仅在用户交互时触发

3. **避免副作用**
   - 防止初始化时触发不必要的 API 调用
   - 防止触发其他表单项的联动更新
   - 避免执行不应在初始化时执行的业务逻辑

### selectFirst 触发条件

自动选中第一项需要同时满足以下条件：

```typescript
if (
  onChange &&                                      // 1. onChange 参数存在
  self.selectFirst &&                              // 2. selectFirst 配置为 true
  self.filteredOptions.length &&                   // 3. 有可用选项
  (selectedOptions = self.getSelectedOptions(self.value)) &&
  !selectedOptions.filter((item: any) => !item.__unmatched).length  // 4. 当前没有已选中的匹配项
) {
  const fistOption = getFirstAvaibleOption(self.filteredOptions);  // 5. 存在非 disabled 的第一项
  if (!fistOption) {
    return;
  }
  // ... 自动选中逻辑
  onChange(value);
}
```

## 推荐解决方案

### 方案 1: 使用 onEvent.inited 监听初始化 ⭐ 推荐

```json
{
  "type": "select",
  "name": "mySelect",
  "label": "选择器",
  "selectFirst": true,
  "options": [
    {"label": "选项1", "value": "1"},
    {"label": "选项2", "value": "2"}
  ],
  "onEvent": {
    "inited": {
      "actions": [
        {
          "actionType": "custom",
          "script": "console.log('初始化完成，当前值:', event.data.value)"
        }
      ]
    },
    "change": {
      "actions": [
        {
          "actionType": "toast",
          "args": {
            "msg": "用户选择了: ${event.data.value}"
          }
        }
      ]
    }
  }
}
```

### 方案 2: 使用数据联动

```json
{
  "type": "form",
  "body": [
    {
      "type": "select",
      "name": "category",
      "selectFirst": true,
      "options": [...]
    },
    {
      "type": "select",
      "name": "subCategory",
      "source": {
        "url": "/api/subCategories",
        "data": {
          "categoryId": "${category}"
        }
      }
    }
  ]
}
```

### 方案 3: source 接口返回默认值

接口返回格式：
```json
{
  "status": 0,
  "msg": "",
  "data": {
    "value": "1",
    "options": [
      {"label": "选项1", "value": "1"},
      {"label": "选项2", "value": "2"}
    ]
  }
}
```

## 输出文件

本次调查产生了以下文件：

1. **SELECT_FIRST_ONCHANGE_ANALYSIS.md** - 详细的源码分析报告
   - 完整的代码执行流程图
   - 源码定位和关键代码片段
   - 设计原因深入分析
   - 多种解决方案和示例
   - 相关测试用例说明

2. **SELECT_FIRST_DEMO.html** - 可独立运行的演示页面
   - 演示 selectFirst 不触发 onChange 的行为
   - 演示使用 onEvent.inited 的推荐方案
   - 演示用户手动选择的对比
   - 包含事件日志实时展示

3. **examples/components/Form/SelectFirstDemo.jsx** - AMIS 示例页面
   - 演示 1: selectFirst 不会触发 onChange
   - 演示 2: 使用 onEvent.inited 监听初始化
   - 演示 3: 数据联动自动触发
   - 演示 4: 无 selectFirst 的对比
   - 演示 5: source 接口返回默认值
   - 包含完整的设计说明文档

4. **SELECT_FIRST_INVESTIGATION_SUMMARY.md** - 本文件
   - 调查总结和核心发现
   - 快速参考指南

## 相关文件索引

### 源码文件
- `/packages/amis-core/src/store/formItem.ts` (第 662-714 行) - setOptions 核心逻辑
- `/packages/amis-core/src/renderers/Options.tsx` (第 898-911 行) - changeOptionValue
- `/packages/amis-core/src/renderers/Options.tsx` (第 608-629 行) - handleToggle 用户交互
- `/packages/amis-core/src/renderers/Options.tsx` (第 316-398 行) - 构造函数初始化

### 测试文件
- `/packages/amis/__tests__/renderers/Form/radios.test.tsx` (第 68-143 行) - selectFirst 测试用例

### 文档文件
- `/docs/zh-CN/components/form/options.md` (第 331-359 行) - selectFirst 配置说明

### 示例文件
- `/examples/components/Linkage/OptionsLocal.jsx` - 使用 selectFirst 的联动示例

## 结论

**selectFirst 不触发 onChange 不是 bug，而是有意设计。**

这种设计：
- ✅ 符合表单行为规范
- ✅ 区分默认值和用户交互
- ✅ 避免初始化时的副作用
- ✅ 提供了多种替代方案

如果需要在初始化时执行逻辑，应该使用：
1. `onEvent.inited` 事件（推荐）
2. 数据联动
3. source 接口返回 value

**不建议修改源码让 selectFirst 触发 onChange**，这会破坏表单的预期行为，可能引入更多问题。

## 使用建议

- 对于需要监听初始值的场景 → 使用 `onEvent.inited`
- 对于联动场景 → 使用数据域变量 `${fieldName}`
- 对于远程数据默认值 → 使用 source 接口返回 value
- 对于需要监听用户操作 → 使用 `onEvent.change` 或 `onChange`

---

**调查完成时间**: 2024
**分支**: `investigate/select-first-no-onchange`
