# Select selectFirst 快速参考

## 问题
select 配置 `selectFirst: true` 后，第一项自动选中但**不触发 onChange 事件**。

## 答案
✅ **这是有意设计，不是 bug**

## 原因
- 区分默认值（初始化）和用户交互（change 事件）
- 符合 HTML 表单规范
- 避免初始化时的副作用

## 源码位置
```
/packages/amis-core/src/store/formItem.ts (662-714行)
/packages/amis-core/src/renderers/Options.tsx (898-911行)
```

## 解决方案

### 1️⃣ 使用 onEvent.inited（推荐）
```json
{
  "type": "select",
  "selectFirst": true,
  "onEvent": {
    "inited": {
      "actions": [{"actionType": "custom", "script": "..."}]
    }
  }
}
```

### 2️⃣ 数据联动
```json
{
  "type": "select",
  "name": "parent",
  "selectFirst": true
},
{
  "type": "select",
  "source": {"url": "/api", "data": {"parentId": "${parent}"}}
}
```

### 3️⃣ source 接口返回 value
```json
{
  "status": 0,
  "data": {
    "value": "1",
    "options": [...]
  }
}
```

## 文档
- 📄 `SELECT_FIRST_INVESTIGATION_SUMMARY.md` - 调查总结
- 📄 `SELECT_FIRST_ONCHANGE_ANALYSIS.md` - 详细分析
- 🌐 `SELECT_FIRST_DEMO.html` - 在线演示
- 📝 `examples/components/Form/SelectFirstDemo.jsx` - AMIS 示例

## 关键代码
```typescript
// 核心判断逻辑
if (formInited === false) {
  setPrinstineValue(value);  // 设置默认值
} else {
  onChange(value);           // 触发事件
}
```
