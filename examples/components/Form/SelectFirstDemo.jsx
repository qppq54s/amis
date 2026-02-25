/**
 * @file SelectFirst 行为演示
 * 演示 selectFirst 配置不会触发 onChange 事件的设计原因
 */

export default {
  type: 'page',
  title: 'Select selectFirst 不触发 onChange 行为演示',
  body: [
    {
      type: 'alert',
      level: 'info',
      body: '本页面演示 select 组件配置 `selectFirst: true` 后，自动选中第一项但不触发 onChange 事件的行为。这是有意设计的，符合表单规范，区分默认值和用户交互。'
    },

    {
      type: 'divider'
    },

    // 演示 1: selectFirst 不触发 onChange
    {
      type: 'panel',
      title: '演示 1: selectFirst 不会触发 onChange',
      body: {
        type: 'form',
        debug: true,
        mode: 'horizontal',
        body: [
          {
            type: 'alert',
            level: 'warning',
            body: '注意观察：初始化时第一项会被自动选中，但下方的"onChange 触发次数"计数器不会增加。只有手动选择其他选项时才会触发 onChange。'
          },
          {
            type: 'select',
            name: 'category1',
            label: '选择分类',
            selectFirst: true,
            options: [
              {label: '选项 A', value: 'a'},
              {label: '选项 B', value: 'b'},
              {label: '选项 C', value: 'c'}
            ]
          },
          {
            type: 'static',
            name: 'category1',
            label: '当前值'
          },
          {
            type: 'tpl',
            label: 'onChange 触发次数',
            tpl: '<span class="text-danger">${onChangeCount1 | default: 0}</span> 次'
          }
        ],
        actions: []
      }
    },

    {
      type: 'divider'
    },

    // 演示 2: 使用 onEvent 监听 inited 事件（推荐方案）
    {
      type: 'panel',
      title: '演示 2: 使用 onEvent.inited 监听初始化（推荐方案）',
      body: {
        type: 'form',
        debug: true,
        mode: 'horizontal',
        body: [
          {
            type: 'alert',
            level: 'success',
            body: '推荐方案：使用 `onEvent.inited` 事件来获取初始化后自动选中的值，使用 `onEvent.change` 来监听用户的交互变化。'
          },
          {
            type: 'select',
            name: 'category2',
            label: '选择分类',
            selectFirst: true,
            options: [
              {label: '选项 A', value: 'a'},
              {label: '选项 B', value: 'b'},
              {label: '选项 C', value: 'c'}
            ],
            onEvent: {
              inited: {
                actions: [
                  {
                    actionType: 'toast',
                    args: {
                      msg: '表单项初始化完成，自动选中值: ${event.data.value}',
                      level: 'info'
                    }
                  },
                  {
                    actionType: 'setValue',
                    componentId: 'initedLog',
                    args: {
                      value: '${event.data.value}'
                    }
                  }
                ]
              },
              change: {
                actions: [
                  {
                    actionType: 'toast',
                    args: {
                      msg: '用户选择了新值: ${event.data.value}',
                      level: 'warning'
                    }
                  }
                ]
              }
            }
          },
          {
            type: 'static',
            name: 'category2',
            label: '当前值'
          },
          {
            type: 'input-text',
            id: 'initedLog',
            name: 'initedValue',
            label: 'inited 事件捕获的值',
            disabled: true
          }
        ],
        actions: []
      }
    },

    {
      type: 'divider'
    },

    // 演示 3: 数据联动
    {
      type: 'panel',
      title: '演示 3: 数据联动（自动触发子选项加载）',
      body: {
        type: 'form',
        debug: true,
        mode: 'horizontal',
        body: [
          {
            type: 'alert',
            level: 'info',
            body: '通过数据联动，即使 selectFirst 不触发 onChange，子选项也能根据父选项的值自动加载。'
          },
          {
            type: 'select',
            name: 'parentCategory',
            label: '父分类',
            selectFirst: true,
            options: [
              {label: '电子产品', value: 'electronics'},
              {label: '图书', value: 'books'},
              {label: '服装', value: 'clothing'}
            ]
          },
          {
            type: 'select',
            name: 'subCategory',
            label: '子分类',
            source: {
              method: 'get',
              url: '/api/mock2/options/level2?parentId=${parentCategory}',
              sendOn: 'this.parentCategory'
            },
            description: '根据父分类自动加载（通过数据域联动）'
          }
        ],
        actions: []
      }
    },

    {
      type: 'divider'
    },

    // 演示 4: 对比无 selectFirst 的情况
    {
      type: 'panel',
      title: '演示 4: 对比 - 无 selectFirst 配置',
      body: {
        type: 'form',
        debug: true,
        mode: 'horizontal',
        body: [
          {
            type: 'alert',
            level: 'default',
            body: '不配置 selectFirst，需要用户手动选择，每次选择都会触发 change 事件。'
          },
          {
            type: 'select',
            name: 'category3',
            label: '选择分类',
            options: [
              {label: '选项 A', value: 'a'},
              {label: '选项 B', value: 'b'},
              {label: '选项 C', value: 'c'}
            ],
            onEvent: {
              change: {
                actions: [
                  {
                    actionType: 'toast',
                    args: {
                      msg: 'change 事件触发: ${event.data.value}'
                    }
                  }
                ]
              }
            }
          },
          {
            type: 'static',
            name: 'category3',
            label: '当前值'
          }
        ],
        actions: []
      }
    },

    {
      type: 'divider'
    },

    // 演示 5: source 接口返回 value
    {
      type: 'panel',
      title: '演示 5: source 接口返回默认值',
      body: {
        type: 'form',
        debug: true,
        mode: 'horizontal',
        body: [
          {
            type: 'alert',
            level: 'info',
            body: '当 source 接口返回的 data 中包含 value 字段时，会自动设置该值。如果此时 formInited=true，则会触发 onChange。'
          },
          {
            type: 'select',
            name: 'category4',
            label: '选择分类',
            source: '/api/mock2/form/getOptions?waitSeconds=1',
            description: '接口返回的 data.value 会被自动设置',
            onEvent: {
              change: {
                actions: [
                  {
                    actionType: 'toast',
                    args: {
                      msg: 'change 事件触发: ${event.data.value}'
                    }
                  }
                ]
              }
            }
          },
          {
            type: 'static',
            name: 'category4',
            label: '当前值'
          }
        ],
        actions: []
      }
    },

    {
      type: 'divider'
    },

    // 总结说明
    {
      type: 'panel',
      title: '设计说明',
      body: [
        {
          type: 'markdown',
          value: `
## 为什么 selectFirst 不触发 onChange？

这是**有意设计**的行为，原因如下：

### 1. 区分初始化和用户交互
- **初始化时的自动选中**：通过 \`setPrinstineValue\` 设置表单项的默认值（pristine value）
- **用户手动选择**：通过 \`onChange\` 触发，会派发 'change' 事件

### 2. 符合表单行为规范
- 在标准的 HTML 表单和大多数 UI 框架中，设置默认值不会触发 change 事件
- change 事件应该只在用户交互时触发
- 防止在表单初始化时触发不必要的联动逻辑

### 3. 避免副作用
如果初始化时触发 onChange，可能会导致：
- 表单初始化时触发不必要的 API 调用
- 触发其他表单项的联动更新
- 执行不应该在初始化时执行的业务逻辑

## 推荐解决方案

1. **使用 onEvent.inited**：在初始化完成后执行逻辑（演示 2）
2. **数据联动**：使用数据域变量自动触发子选项加载（演示 3）
3. **source 接口返回 value**：接口直接返回默认值（演示 5）

## 核心代码位置

- \`/packages/amis-core/src/store/formItem.ts\` (第 662-714 行) - setOptions 函数
- \`/packages/amis-core/src/renderers/Options.tsx\` (第 898-911 行) - changeOptionValue 函数

详细分析请参考: \`SELECT_FIRST_ONCHANGE_ANALYSIS.md\`
          `
        }
      ]
    }
  ]
};
