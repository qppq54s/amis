# Select 组件 selectFirst 事件未触发问题分析

## 问题描述

当 select 组件配置 `selectFirst: true` 时存在以下问题：
1. 第一项被自动选中，但 **不会触发 `onChange` 事件**
2. 组件的 **`inited` 事件也未被触发**

## 源码定位与根因分析

### 1. selectFirst 的实现位置

**文件**: `/packages/amis-core/src/store/formItem.ts`  
**代码位置**: 第 662-714 行，在 `setOptions` 方法中

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
  // ... 其他代码
  syncOptions(originOptions, data);
  let selectedOptions;

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

    onChange(value);  // 这里调用 onChange
  }
}
```

**关键点**：当 `selectFirst` 为 true 时，`setOptions` 会调用传入的 `onChange` 回调来设置第一个选项的值。

### 2. onChange 回调的来源

**文件**: `/packages/amis-core/src/renderers/Options.tsx`  
**代码位置**: 第 898-911 行，`changeOptionValue` 方法

```typescript
@autobind
changeOptionValue(value: any) {
  const {
    onChange,
    formInited,
    setPrinstineValue,
    value: originValue
  } = this.props;

  if (formInited === false) {
    originValue === undefined && setPrinstineValue?.(value);
  } else {
    onChange?.(value);
  }
}
```

**关键发现 1**: `changeOptionValue` 方法会检查 `formInited` 标志：
- 如果 `formInited === false`（表单未初始化完成），则调用 `setPrinstineValue` 而不是 `onChange`
- 只有当表单已初始化时，才会调用 `onChange`

### 3. 选项加载时机

**文件**: `/packages/amis-core/src/renderers/Options.tsx`  
**代码位置**: 第 383-397 行，构造函数中

```typescript
if (loadOptions && config.autoLoadOptionsFromSource !== false) {
  this.toDispose.push(
    formInited || !addHook
      ? formItem.addInitHook(async () => {
          await this.reload();
          setInitValue?.();
        })
      : addHook(async (data: any) => {
          await this.initOptions(data);
          setInitValue?.();
        }, 'init')
  );
}
```

**关键发现 2**: 当配置了 `source` 时，选项的加载是通过 `addInitHook` 添加到初始化钩子中的。这意味着：
- 选项加载发生在组件初始化阶段
- `setOptions` 的调用发生在初始化钩子执行期间
- 此时 `formInited` 仍然是 `false`

### 4. inited 标志的设置时机

**文件**: `/packages/amis-core/src/store/formItem.ts`  
**代码位置**: 第 1577-1590 行

```typescript
const init: () => Promise<void> = flow(function* init() {
  const hooks = initHooks.sort(
    (a: any, b: any) => (a.__weight || 0) - (b.__weight || 0)
  );
  try {
    for (let hook of hooks) {
      yield hook(self);
    }
  } finally {
    if (isAlive(self)) {
      self.inited = true;  // 在所有 init hooks 执行完成后才设置
    }
  }
});
```

**关键发现 3**: `inited` 标志只有在所有初始化钩子执行完成后才会设置为 `true`。

### 5. init() 方法的调用时机

**文件**: `/packages/amis-core/src/renderers/wrapControl.tsx`  
**代码位置**: 第 354 行，在 `componentDidMount` 中

```typescript
componentDidMount() {
  // ... 其他代码
  formItem?.init();
}
```

## 根本原因总结

### 为什么 onChange 事件不触发？

1. **时序问题**：
   ```
   组件挂载 
   → componentDidMount
   → formItem.init() 开始执行
   → 执行 init hooks（此时 formInited = false, inited = false）
     → reload() 加载选项
     → setOptions() 被调用
     → selectFirst 逻辑触发
     → 调用 changeOptionValue(value)
     → 检测到 formInited === false
     → 调用 setPrinstineValue 而不是 onChange ❌
   → 所有 init hooks 执行完成
   → 设置 inited = true
   ```

2. **设计意图**: 这是**有意为之的设计**，目的是避免在组件初始化阶段触发不必要的 onChange 事件。
   - 初始化时的值设置应该使用 `setPrinstineValue` 来设置初始值
   - 只有用户交互或外部数据变化才应该触发 `onChange`

### 为什么 inited 事件不触发？

1. **formItem.inited 标志位**: 这个标志位主要用于内部状态管理，并不直接对应一个可供外部监听的事件
2. **事件机制缺失**: 在 amis 框架中，并没有为 formItem 的 `inited` 状态变化提供对应的事件派发机制
3. **对比其他组件**: 
   - Service 组件有 `inited` 事件（见 `/packages/amis/src/renderers/Service.tsx`）
   - Wizard 组件有 `inited` 事件
   - 但普通的表单项（FormItem）并没有暴露 `inited` 事件

## 解决方案

### 方案一：监听 loadOptionsFinished 事件（推荐）

如果需要在选项加载完成后执行操作，可以使用 `loadOptionsFinished` 事件：

```json
{
  "type": "select",
  "name": "select",
  "label": "选择器",
  "selectFirst": true,
  "source": "/api/options",
  "onEvent": {
    "loadOptionsFinished": {
      "actions": [
        {
          "actionType": "toast",
          "args": {
            "msgType": "info",
            "msg": "选项加载完成，已自动选中第一项"
          }
        }
      ]
    }
  }
}
```

**代码位置**: `/packages/amis-core/src/renderers/Options.tsx` 第 419-439 行

### 方案二：使用 defaultValue 并监听 change 事件

如果需要在初始化时也触发 onChange，可以不使用 `selectFirst`，而是通过以下方式：

```json
{
  "type": "select",
  "name": "select",
  "label": "选择器",
  "source": "/api/options",
  "onEvent": {
    "loadOptionsFinished": {
      "actions": [
        {
          "actionType": "setValue",
          "componentId": "select",
          "args": {
            "value": "${items[0].value}"
          }
        }
      ]
    },
    "change": {
      "actions": [
        {
          "actionType": "toast",
          "args": {
            "msgType": "info",
            "msg": "值已改变: ${event.data.value}"
          }
        }
      ]
    }
  }
}
```

### 方案三：在表单层面监听 inited 事件

表单（Form）组件本身有 `inited` 事件，可以在表单级别监听：

```json
{
  "type": "form",
  "onEvent": {
    "inited": {
      "actions": [
        {
          "actionType": "custom",
          "script": "console.log('表单初始化完成', event.data)"
        }
      ]
    }
  },
  "body": [
    {
      "type": "select",
      "name": "select",
      "selectFirst": true,
      "source": "/api/options"
    }
  ]
}
```

## 代码改进建议

如果确实需要让 `selectFirst` 支持触发 onChange 事件，可以考虑以下改动：

### 改动点 1: 在 formItem store 中添加配置选项

**文件**: `/packages/amis-core/src/store/formItem.ts`

```typescript
// 在 FormItemStore props 中添加
selectFirstTriggerChange: false,  // 新增配置项

// 在 setOptions 方法中修改
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

  // 根据配置决定是否强制触发 onChange
  onChange(value, self.selectFirstTriggerChange);
}
```

### 改动点 2: 在 changeOptionValue 中支持强制触发

**文件**: `/packages/amis-core/src/renderers/Options.tsx`

```typescript
@autobind
changeOptionValue(value: any, forceChange?: boolean) {
  const {
    onChange,
    formInited,
    setPrinstineValue,
    value: originValue
  } = this.props;

  if (formInited === false && !forceChange) {
    originValue === undefined && setPrinstineValue?.(value);
  } else {
    onChange?.(value);
  }
}
```

### 改动点 3: 添加 inited 事件派发

**文件**: `/packages/amis-core/src/renderers/wrapControl.tsx`

在 `componentDidMount` 的 `formItem?.init()` 后添加：

```typescript
componentDidMount() {
  // ... 现有代码
  
  formItem?.init().then(() => {
    // 派发 inited 事件
    this.props.dispatchEvent?.('inited', {
      data: this.props.data
    });
  });
}
```

**注意**: 这些改动可能会影响现有的业务逻辑，需要充分测试。

## 最佳实践建议

1. **理解 selectFirst 的设计意图**: 
   - `selectFirst` 主要用于自动设置初始值，而不是触发业务逻辑
   - 如果需要在选中时执行业务逻辑，应该使用 `change` 事件 + 手动设置值的方式

2. **使用正确的事件**:
   - 初始化完成: 使用 `loadOptionsFinished` 或表单的 `inited` 事件
   - 值改变: 使用 `change` 事件
   - 用户交互: 使用 `change` 事件

3. **区分初始化和用户操作**:
   - 如果某些逻辑只应该在用户操作时触发，不应该依赖 `selectFirst`
   - 应该在 `change` 事件中添加判断逻辑

4. **表单初始化流程理解**:
   ```
   表单创建 
   → 字段注册
   → 执行 init hooks（加载数据、设置默认值等）
   → 设置 inited 标志
   → 组件渲染完成
   → 可以响应用户交互
   ```

## 相关源码文件清单

1. **核心逻辑**:
   - `/packages/amis-core/src/store/formItem.ts` - FormItem Store，包含 selectFirst 逻辑
   - `/packages/amis-core/src/renderers/Options.tsx` - Options 渲染器基类
   - `/packages/amis-core/src/renderers/wrapControl.tsx` - 表单控件包装器

2. **类型定义**:
   - `/packages/amis-core/src/renderers/Options.tsx` (第 70-218 行) - AMISFormItemWithOptions 接口

3. **测试文件**:
   - `/packages/amis/__tests__/renderers/Form/select.test.tsx` - Select 组件测试

## 总结

1. **onChange 不触发的原因**: 这是框架的**预期行为**，在初始化阶段不应该触发 onChange 事件，而是通过 `setPrinstineValue` 设置初始值

2. **inited 事件不存在的原因**: FormItem 层面没有提供 `inited` 事件的派发机制，只有内部状态标志

3. **推荐解决方案**: 
   - 使用 `loadOptionsFinished` 事件来监听选项加载完成
   - 使用 Form 层面的 `inited` 事件来监听表单初始化完成
   - 如果需要在值改变时执行逻辑，使用 `change` 事件配合条件判断

4. **不建议修改**: 除非有非常充分的理由，否则不建议修改框架的初始化逻辑，因为这可能会影响大量现有应用
