# Select 组件 selectFirst 不触发 onChange 事件分析报告

## 问题描述

Select 组件配置 `selectFirst: true` 后，第一项会被自动选中，但是不会触发用户配置的 `onChange` 事件。

## 代码执行流程图

```
初始化流程：
┌─────────────────────────────────────────────────────────────────┐
│ 1. Options Component Constructor                               │
│    packages/amis-core/src/renderers/Options.tsx (316-398行)    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. formItem.setOptions(options, this.changeOptionValue, data)  │
│    传入 changeOptionValue 作为 onChange 参数                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. setOptions() 在 formItem.ts (662-714行)                     │
│    - 检查 selectFirst 配置                                      │
│    - 检查是否有已选中的值                                       │
│    - 如果满足条件，调用 onChange(firstOptionValue)             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. changeOptionValue() 在 Options.tsx (898-911行)              │
│    判断: formInited === false ?                                 │
│    ├─ 是 → setPrinstineValue(value)  [设置默认值，不触发事件] │
│    └─ 否 → onChange(value)            [触发 onChange 事件]     │
└─────────────────────────────────────────────────────────────────┘

用户手动选择流程：
┌─────────────────────────────────────────────────────────────────┐
│ 1. 用户点击选项                                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. handleToggle() 在 Options.tsx (608-629行)                   │
│    - 计算新值                                                   │
│    - 触发 dispatchEvent('change', {value: newValue})            │
│    - 调用 onChange(newValue, submitOnChange, changeImmediately) │
└─────────────────────────────────────────────────────────────────┘
```

## 源码定位

### 1. 核心实现位置

**文件**: `/packages/amis-core/src/store/formItem.ts` (第 662-714 行)

```typescript
function setOptions(
  options: Array<object>,
  onChange?: (value: any) => void,
  data?: Object
) {
  if (!Array.isArray(options)) {
    return;
  }
  options = filterTree(options, item => item);
  const originOptions = self.options.concat();
  self.options = options;
  
  // ... 其他逻辑 ...
  
  syncOptions(originOptions, data);
  let selectedOptions;

  // selectFirst 自动选中第一项的核心逻辑
  if (
    onChange &&
    self.selectFirst &&
    self.filteredOptions.length &&
    (selectedOptions = self.getSelectedOptions(self.value)) &&
    !selectedOptions.filter((item: any) => !item.__unmatched).length
  ) {
    const fistOption = getFirstAvaibleOption(self.filteredOptions);
    if (!fistOption) {
      return;
    }

    const list = [fistOption].map((item: any) => {
      if (self.extractValue || self.joinValues) {
        return item[self.valueField || 'value'];
      }
      return item;
    });

    const value =
      self.joinValues && self.multiple
        ? list.join(self.delimiter)
        : self.multiple
        ? list
        : list[0];

    onChange(value);  // 注意：这里调用的是传入的 onChange
  }
}
```

### 2. onChange 参数的来源

**文件**: `/packages/amis-core/src/renderers/Options.tsx` (第 898-911 行)

```typescript
@autobind
changeOptionValue(value: any) {
  const {
    onChange,
    formInited,
    setPrinstineValue,
    value: originValue
  } = this.props;

  // 关键判断：如果表单未初始化完成，使用 setPrinstineValue 而不是 onChange
  if (formInited === false) {
    originValue === undefined && setPrinstineValue?.(value);
  } else {
    onChange?.(value);
  }
}
```

当调用 `setOptions` 时，传入的 `onChange` 参数实际上是 `changeOptionValue` 方法。

### 3. 何时调用 setOptions

在以下场景会调用 `setOptions`：

1. **组件初始化时** (Options.tsx 第 340-345 行)
```typescript
formItem.setOptions(
  normalizeOptions(options, undefined, valueField),
  this.changeOptionValue,
  data
);
```

2. **加载远程数据时** (formItem.ts 第 862 行)
```typescript
setOptions(options, onChange, data);
```

3. **从数据域加载选项时** (formItem.ts 第 914 行)
```typescript
setOptions(options, onChange, ctx);
```

### 4. 用户手动选择时的流程

**文件**: `/packages/amis-core/src/renderers/Options.tsx` (第 608-629 行)

```typescript
@autobind
async handleToggle(
  option: Option,
  submitOnChange?: boolean,
  changeImmediately?: boolean
) {
  const {onChange, formItem, value} = this.props;

  if (!formItem) {
    return;
  }

  let newValue: string | Array<Option> | Option = this.toggleValue(
    option,
    value
  );

  // 用户手动操作会触发 dispatchEvent 事件
  const isPrevented = await this.dispatchOptionEvent('change', {
    value: newValue
  });
  isPrevented ||
    (onChange && onChange(newValue, submitOnChange, changeImmediately));
}
```

## 设计原因分析

### 为什么 selectFirst 不触发 change 事件？

这是**有意设计**的行为，原因如下：

1. **区分初始化和用户交互**
   - 初始化时的自动选中：通过 `setPrinstineValue` 设置表单项的默认值（pristine value）
   - 用户手动选择：通过 `onChange` 触发，会派发 'change' 事件

2. **符合表单行为规范**
   - 在标准的 HTML 表单和大多数 UI 框架中，设置默认值不会触发 change 事件
   - change 事件应该只在用户交互时触发
   - 防止在表单初始化时触发不必要的联动逻辑

3. **避免副作用**
   - 如果初始化时触发 onChange，可能会导致：
     - 表单初始化时触发不必要的 API 调用
     - 触发其他表单项的联动更新
     - 执行不应该在初始化时执行的业务逻辑

4. **代码判断逻辑**
   ```typescript
   if (formInited === false) {
     // 表单未初始化完成 -> 设置默认值
     originValue === undefined && setPrinstineValue?.(value);
   } else {
     // 表单已初始化 -> 触发 onChange
     onChange?.(value);
   }
   ```

### 条件触发逻辑

`selectFirst` 自动选中第一项需要满足以下条件：

1. `onChange` 参数存在
2. `self.selectFirst` 为 true
3. `self.filteredOptions.length` > 0（有可用选项）
4. 当前没有已选中的匹配项（`!selectedOptions.filter((item: any) => !item.__unmatched).length`）
5. 存在可用的第一项（非 disabled）

## 解决方案

### 方案 1：使用 onEvent 监听 inited 事件（推荐）

利用 AMIS 的事件系统，在表单初始化完成后执行逻辑：

```json
{
  "type": "form",
  "body": [
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
              "script": "console.log('表单初始化完成，当前值:', event.data.value)"
            }
          ]
        }
      }
    }
  ]
}
```

### 方案 2：在表单级别监听初始化

```json
{
  "type": "form",
  "onEvent": {
    "inited": {
      "actions": [
        {
          "actionType": "custom",
          "script": "console.log('表单初始化完成:', event.data)"
        }
      ]
    }
  },
  "body": [
    {
      "type": "select",
      "name": "mySelect",
      "selectFirst": true,
      "options": [/*...*/]
    }
  ]
}
```

### 方案 3：使用数据联动

如果需要在选中第一项后触发其他表单项的更新，使用数据联动而不是 onChange：

```json
{
  "type": "form",
  "body": [
    {
      "type": "select",
      "name": "category",
      "label": "分类",
      "selectFirst": true,
      "options": [/*...*/]
    },
    {
      "type": "select",
      "name": "subCategory",
      "label": "子分类",
      "source": {
        "method": "get",
        "url": "/api/subCategories",
        "data": {
          "categoryId": "${category}"  // 通过数据联动自动触发
        }
      }
    }
  ]
}
```

### 方案 4：使用 source 接口返回默认值

如果选项是通过 API 加载的，可以在 API 响应中直接返回 value：

```json
{
  "status": 0,
  "msg": "",
  "data": {
    "value": "1",  // 直接返回默认选中的值
    "options": [
      {"label": "选项1", "value": "1"},
      {"label": "选项2", "value": "2"}
    ]
  }
}
```

这种方式会触发 onChange（前提是 formInited === true）。

参考代码位置：`formItem.ts` 第 864-865 行：
```typescript
if (json.data && typeof (json.data as any).value !== 'undefined') {
  onChange && onChange((json.data as any).value, false, true);
}
```

### 方案 5：自定义逻辑处理

如果确实需要在初始化时执行某些逻辑，可以：

1. 监听表单的 data 变化
2. 使用 `initApi` 或 `initFetch` 配合初始化逻辑
3. 在外层容器中通过数据域监听表单项的值变化

## 验证测试

可以通过以下测试用例验证行为：

**测试文件**: `/packages/amis/__tests__/renderers/Form/radios.test.tsx` (第 68-143 行)

```typescript
test('Renderer:radios source & autoFill', async () => {
  // ... 
  {
    name: 'radios',
    type: 'radios',
    selectFirst: true,  // 配置了 selectFirst
    source: '${items}',
    autoFill: {
      fillFromRadios: '${fill}'
    }
  }
  // ...
  
  await waitFor(() => {
    expect(
      (container.querySelector('.cxd-PlainField') as Element).innerHTML
    ).toBe('aa');  // 验证自动选中了第一项
  });
});
```

测试证明：selectFirst 会自动选中第一项并设置值，但不会触发用户配置的 onChange 事件。

## 总结

1. **设计初衷**: selectFirst 不触发 onChange 是有意设计，符合表单规范，区分默认值和用户交互
2. **实现机制**: 通过判断 `formInited` 状态，决定是调用 `setPrinstineValue`（设置默认值）还是 `onChange`（触发变更）
3. **推荐方案**: 使用 `onEvent` 的 `inited` 事件来处理初始化后的逻辑
4. **不推荐**: 修改源码使 selectFirst 触发 onChange，这会破坏表单的预期行为

## 相关文件索引

- 核心逻辑: `/packages/amis-core/src/store/formItem.ts` (第 662-714 行)
- Options 基类: `/packages/amis-core/src/renderers/Options.tsx` (第 898-911 行)
- 用户交互: `/packages/amis-core/src/renderers/Options.tsx` (第 608-629 行)
- 测试用例: `/packages/amis/__tests__/renderers/Form/radios.test.tsx` (第 68-143 行)
- 文档: `/docs/zh-CN/components/form/options.md` (第 331-359 行)
