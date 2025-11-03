# selectFirst 行为验证测试

## 测试目的

验证 select 组件配置 `selectFirst: true` 时的实际行为。

## 测试代码示例

### 测试 1: 基础 selectFirst 行为

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>SelectFirst Test</title>
    <link rel="stylesheet" href="sdk.css">
    <script src="sdk.js"></script>
</head>
<body>
    <div id="root"></div>
    <script type="text/javascript">
        (function () {
            let amis = amisRequire('amis/embed');
            let changeCount = 0;
            let initedCount = 0;
            
            const schema = {
                type: 'page',
                body: {
                    type: 'form',
                    debug: true,
                    onEvent: {
                        inited: {
                            actions: [
                                {
                                    actionType: 'custom',
                                    script: `
                                        initedCount++;
                                        console.log('Form inited event fired', initedCount);
                                        document.getElementById('form-inited').innerText = 
                                            'Form inited 触发次数: ' + initedCount;
                                    `
                                }
                            ]
                        }
                    },
                    body: [
                        {
                            type: 'static',
                            id: 'form-inited',
                            label: '表单初始化状态',
                            value: 'Form inited 触发次数: 0'
                        },
                        {
                            type: 'static',
                            id: 'change-count',
                            label: 'Change事件',
                            value: 'Change 触发次数: 0'
                        },
                        {
                            type: 'static',
                            id: 'load-finished',
                            label: '加载完成事件',
                            value: 'LoadOptionsFinished 触发次数: 0'
                        },
                        {
                            type: 'divider'
                        },
                        {
                            type: 'select',
                            name: 'select1',
                            label: '测试1: selectFirst + 静态options',
                            selectFirst: true,
                            options: [
                                { label: '选项A', value: 'a' },
                                { label: '选项B', value: 'b' },
                                { label: '选项C', value: 'c' }
                            ],
                            onEvent: {
                                change: {
                                    actions: [
                                        {
                                            actionType: 'custom',
                                            script: `
                                                changeCount++;
                                                console.log('Select1 change event fired', changeCount, event.data.value);
                                                document.getElementById('change-count').innerText = 
                                                    'Change 触发次数: ' + changeCount + ' (最后值: ' + event.data.value + ')';
                                            `
                                        }
                                    ]
                                }
                            }
                        },
                        {
                            type: 'select',
                            name: 'select2',
                            label: '测试2: selectFirst + API source',
                            selectFirst: true,
                            source: {
                                method: 'get',
                                url: '/api/mock2/options/level1',
                                adaptor: `
                                    console.log('API返回数据:', payload);
                                    return {
                                        ...payload,
                                        data: {
                                            options: [
                                                { label: 'API选项1', value: 'api1' },
                                                { label: 'API选项2', value: 'api2' },
                                                { label: 'API选项3', value: 'api3' }
                                            ]
                                        }
                                    };
                                `
                            },
                            onEvent: {
                                change: {
                                    actions: [
                                        {
                                            actionType: 'custom',
                                            script: `
                                                console.log('Select2 change event fired', event.data.value);
                                            `
                                        }
                                    ]
                                },
                                loadOptionsFinished: {
                                    actions: [
                                        {
                                            actionType: 'custom',
                                            script: `
                                                console.log('Select2 loadOptionsFinished event fired', event.data);
                                                document.getElementById('load-finished').innerText = 
                                                    'LoadOptionsFinished 触发次数: 1 (options数量: ' + event.data.options.length + ')';
                                            `
                                        }
                                    ]
                                }
                            }
                        },
                        {
                            type: 'select',
                            name: 'select3',
                            label: '测试3: 无selectFirst',
                            options: [
                                { label: '选项X', value: 'x' },
                                { label: '选项Y', value: 'y' },
                                { label: '选项Z', value: 'z' }
                            ],
                            onEvent: {
                                change: {
                                    actions: [
                                        {
                                            actionType: 'custom',
                                            script: `
                                                console.log('Select3 change event fired (无selectFirst)', event.data.value);
                                            `
                                        }
                                    ]
                                }
                            }
                        }
                    ]
                }
            };

            amis.embed('#root', schema, {}, {
                fetcher: function(config) {
                    console.log('Fetcher called:', config.url);
                    // 模拟API响应
                    if (config.url === '/api/mock2/options/level1') {
                        return Promise.resolve({
                            status: 0,
                            msg: 'ok',
                            data: {
                                options: [
                                    { label: 'API选项1', value: 'api1' },
                                    { label: 'API选项2', value: 'api2' },
                                    { label: 'API选项3', value: 'api3' }
                                ]
                            }
                        });
                    }
                    return Promise.reject('Unknown API');
                }
            });
        })();
    </script>
</body>
</html>
```

## 预期结果

基于源码分析，预期的行为应该是：

### 测试1: selectFirst + 静态options
- ✅ 第一个选项 "选项A" 会被自动选中
- ❌ **不会触发** `change` 事件
- ✅ 表单的 `inited` 事件会触发
- 📊 `changeCount` 应该保持为 0

### 测试2: selectFirst + API source  
- ✅ API 加载完成后，第一个选项 "API选项1" 会被自动选中
- ❌ **不会触发** `change` 事件
- ✅ `loadOptionsFinished` 事件会触发
- ✅ 表单的 `inited` 事件会触发
- 📊 `changeCount` 应该保持为 0

### 测试3: 无selectFirst
- ✅ 不会自动选中任何选项
- ❌ **不会触发** `change` 事件
- ✅ 表单的 `inited` 事件会触发

### 用户手动选择时
- ✅ **会触发** `change` 事件
- 📊 `changeCount` 会增加

## 关键观察点

1. **控制台输出顺序**:
   ```
   [预期] Fetcher called: /api/mock2/options/level1
   [预期] API返回数据: {...}
   [预期] Form inited event fired 1
   [预期] Select2 loadOptionsFinished event fired {...}
   [不会出现] Select1 change event fired
   [不会出现] Select2 change event fired
   ```

2. **表单数据**:
   - 打开表单的 debug 面板，应该能看到：
     - `select1: "a"` (第一个选项的值)
     - `select2: "api1"` (API第一个选项的值)
     - `select3: undefined` 或空值

3. **时序关系**:
   ```
   组件挂载
   → 执行 init hooks
     → 加载 API 数据 (如果有)
     → setOptions 被调用
     → selectFirst 逻辑执行
     → 调用 setPrinstineValue (不是 onChange)
   → 所有 hooks 完成
   → 设置 inited = true
   → 派发 Form.inited 事件
   → 派发 loadOptionsFinished 事件
   ```

## 验证方法

### 方法1: 使用浏览器开发工具
1. 打开浏览器控制台
2. 加载测试页面
3. 观察控制台日志输出
4. 检查页面上的计数器显示

### 方法2: 使用单元测试

```typescript
import {render, waitFor} from '@testing-library/react';
import {render as amisRender} from 'amis';
import {makeEnv} from './helper';

test('selectFirst should not trigger onChange event', async () => {
  const onChange = jest.fn();
  const onInited = jest.fn();
  
  const {container} = render(
    amisRender(
      {
        type: 'form',
        onEvent: {
          inited: {
            actions: [
              {
                actionType: 'custom',
                script: 'onInited(event.data)'
              }
            ]
          }
        },
        body: [
          {
            type: 'select',
            name: 'select',
            selectFirst: true,
            options: [
              {label: 'A', value: 'a'},
              {label: 'B', value: 'b'}
            ],
            onEvent: {
              change: {
                actions: [
                  {
                    actionType: 'custom',
                    script: 'onChange(event.data)'
                  }
                ]
              }
            }
          }
        ]
      },
      {
        onChange,
        onInited
      },
      makeEnv()
    )
  );

  await waitFor(() => {
    // Form inited 事件应该触发
    expect(onInited).toHaveBeenCalledTimes(1);
    
    // select 的 change 事件不应该触发
    expect(onChange).not.toHaveBeenCalled();
  });
  
  // 验证值已经被设置
  const formData = container.querySelector('[data-testid="form-data"]');
  expect(formData?.textContent).toContain('"select":"a"');
});
```

## 实际测试结果记录

### 测试环境
- amis 版本: [填写版本]
- 浏览器: [填写浏览器及版本]
- 测试日期: [填写日期]

### 测试结果
| 测试项 | 预期结果 | 实际结果 | 是否通过 |
|--------|----------|----------|----------|
| selectFirst 自动选中第一项 | ✅ | [ ] | [ ] |
| onChange 事件不触发 | ❌ | [ ] | [ ] |
| form.inited 事件触发 | ✅ | [ ] | [ ] |
| loadOptionsFinished 事件触发 | ✅ | [ ] | [ ] |
| 表单数据正确设置 | ✅ | [ ] | [ ] |
| 手动选择触发 change | ✅ | [ ] | [ ] |

### 控制台日志
```
[在此粘贴实际的控制台输出]
```

### 结论
[根据实际测试结果填写结论]
