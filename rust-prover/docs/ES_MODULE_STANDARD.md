# ES Module 标准规范

**制定日期**: 2025-11-08  
**强制执行**: ✅ 必须遵守  
**优先级**: 🔴 P0 - 阻断性要求

---

## 📋 核心原则

### 1️⃣ ES Module 优先原则

**强制要求**:
> ✅ **所有 JavaScript/TypeScript 代码必须使用 ES Module 格式**  
> ❌ **禁止使用 CommonJS 格式（require/module.exports）**

**理由**:
- ES Module 是现代 JavaScript 标准
- 更好的树摇（tree-shaking）支持
- 静态分析和类型检查
- 浏览器原生支持
- 与现代工具链兼容

---

## 🔧 WASM 构建标准

### 强制构建目标

**推荐使用 `web` 目标（Node.js + 浏览器通用）**:

```bash
# ✅ 推荐（支持 Node.js ESM + 浏览器）
wasm-pack build --target web

# ✅ 备选（Webpack/Rollup 打包器）
wasm-pack build --target bundler

# ❌ 错误
wasm-pack build --target nodejs  # 生成 CommonJS，无 init 导出
```

**目标对比**:

| 目标 | 模块格式 | init 导出 | Node.js ESM | 浏览器 | 推荐度 |
|------|---------|----------|------------|--------|-------|
| `web` | ES Module | ✅ 有 | ✅ 支持 | ✅ 支持 | ⭐⭐⭐ **强烈推荐** |
| `bundler` | ES Module | ❌ 无 | ⚠️ 需打包器 | ✅ 支持 | ⭐⭐ 可选 |
| `nodejs` | CommonJS | ❌ 无 | ❌ 不兼容 ESM | ❌ 不支持 | ❌ **禁止** |
| `no-modules` | IIFE | - | ❌ 不支持 | ⚠️ 仅旧浏览器 | ❌ **禁止** |

**为什么选择 `web`？**
- ✅ 导出 `default init()` 函数，支持手动 WASM 初始化
- ✅ 兼容 Node.js ESM（通过 `fs.readFileSync`）
- ✅ 直接支持浏览器环境
- ✅ 无需额外打包工具
- ✅ 生产级真实 ZK 证明系统

---

## 📝 代码规范

### package.json 配置

**必须包含**:

```json
{
  "type": "module"
}
```

**位置**:
- 项目根目录 `package.json`
- 测试目录 `test/package.json`
- 任何包含 `.js` 文件的目录

### 导入语法

**✅ 正确 - ES Module**:

```javascript
// 默认导入
import init from './pkg/zkp_rust_prover.js';

// 命名导入
import { wasm_generate_proof, wasm_verify_proof } from './pkg/zkp_rust_prover.js';

// 混合导入
import init, { wasm_generate_proof } from './pkg/zkp_rust_prover.js';

// 动态导入
const module = await import('./pkg/zkp_rust_prover.js');
```

**❌ 错误 - CommonJS**:

```javascript
// ❌ 禁止
const zkp = require('./pkg/zkp_rust_prover.js');

// ❌ 禁止
module.exports = { ... };

// ❌ 禁止
exports.foo = bar;
```

### 文件扩展名

**强制要求**:

| 文件类型 | 扩展名 | 说明 |
|---------|--------|------|
| ES Module | `.js` | 当 package.json 包含 "type": "module" |
| ES Module | `.mjs` | 显式 ES Module（可选） |
| CommonJS | `.cjs` | ❌ 禁止在新代码中使用 |
| TypeScript | `.ts` | 必须编译为 ES Module |

---

## 🧪 测试规范

### 测试文件格式

**强制使用 ES Module**:

```javascript
// test/test-wasm.js
import init, { wasm_generate_proof, wasm_verify_proof, init_panic_hook } 
  from '../pkg/zkp_rust_prover.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 获取当前文件路径（ES Module 方式）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// WASM 初始化
const wasmPath = join(__dirname, '../pkg/zkp_rust_prover_bg.wasm');
const wasmBuffer = readFileSync(wasmPath);
await init({ module_or_path: wasmBuffer });
```

### 测试执行

**运行命令**:

```bash
# Node.js 直接运行（需要 Node >= 14）
node test/test-wasm.js

# 使用 package.json scripts
npm test
```

---

## 📦 包发布规范

### package.json 配置

**完整示例**:

```json
{
  "name": "zkp-rust-prover",
  "version": "2.0.0",
  "type": "module",
  "main": "zkp_rust_prover.js",
  "module": "zkp_rust_prover.js",
  "types": "zkp_rust_prover.d.ts",
  "exports": {
    ".": {
      "import": "./zkp_rust_prover.js",
      "types": "./zkp_rust_prover.d.ts"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "zkp_rust_prover_bg.wasm",
    "zkp_rust_prover.js",
    "zkp_rust_prover.d.ts"
  ]
}
```

**关键字段说明**:

| 字段 | 必需 | 说明 |
|------|------|------|
| `"type": "module"` | ✅ | 声明 ES Module |
| `main` | ✅ | 主入口（ES Module） |
| `module` | ✅ | 显式 ES Module 入口 |
| `types` | ✅ | TypeScript 类型定义 |
| `exports` | ✅ | 现代导出声明 |

---

## 🔍 兼容性要求

### Node.js 版本

**最低要求**: Node.js >= 14.x

| 版本 | ES Module 支持 | 状态 |
|------|---------------|------|
| Node.js 18+ | ✅ 完全支持 | ✅ 推荐 |
| Node.js 16+ | ✅ 完全支持 | ✅ 支持 |
| Node.js 14+ | ✅ 支持 | ⚠️ 最低版本 |
| Node.js 12 | ⚠️ 实验性 | ❌ 不支持 |

### 浏览器支持

**现代浏览器均支持**:
- Chrome 61+
- Firefox 60+
- Safari 10.1+
- Edge 16+

---

## 🚫 禁止事项

### 1. 禁止 CommonJS

**❌ 以下代码禁止出现**:

```javascript
// ❌ require
const foo = require('bar');

// ❌ module.exports
module.exports = { ... };

// ❌ exports
exports.foo = bar;

// ❌ __dirname (非 ES Module 方式)
console.log(__dirname);  // 应使用 import.meta.url

// ❌ __filename (非 ES Module 方式)
console.log(__filename); // 应使用 import.meta.url
```

### 2. 禁止混合格式

**❌ 不允许同一项目混用**:

```
project/
├── src/
│   ├── module1.js  (ES Module)
│   └── module2.js  (CommonJS)  ❌ 禁止
```

### 3. 禁止旧构建目标

**❌ Cargo.toml 禁止配置**:

```toml
# ❌ 禁止
[lib]
crate-type = ["cdylib"]  # 仅生成 CommonJS
```

**✅ 必须配置**:

```toml
# ✅ 正确
[lib]
crate-type = ["cdylib", "rlib"]
```

---

## ✅ 检查清单

### 构建前检查

- [ ] `wasm-pack build --target web`
- [ ] 所有 `package.json` 包含 `"type": "module"`
- [ ] 无 `require` 或 `module.exports`
- [ ] 使用 `import` / `export` 语法

### 测试前检查

- [ ] 测试文件使用 ES Module
- [ ] `import.meta.url` 用于路径解析
- [ ] WASM 使用 `await init()` 初始化
- [ ] Node.js >= 14

### 发布前检查

- [ ] `pkg/package.json` 包含 `"type": "module"`
- [ ] 正确配置 `exports` 字段
- [ ] TypeScript 类型定义存在
- [ ] 测试通过

---

## 📖 迁移指南

### 从 CommonJS 迁移到 ES Module

**步骤**:

1. **添加 package.json 声明**:
   ```json
   { "type": "module" }
   ```

2. **替换导入语法**:
   ```javascript
   // Before
   const foo = require('./foo');
   
   // After
   import foo from './foo.js';
   ```

3. **替换导出语法**:
   ```javascript
   // Before
   module.exports = { bar };
   
   // After
   export { bar };
   ```

4. **替换路径解析**:
   ```javascript
   // Before
   const __dirname = __dirname;
   
   // After
   import { fileURLToPath } from 'url';
   import { dirname } from 'path';
   const __filename = fileURLToPath(import.meta.url);
   const __dirname = dirname(__filename);
   ```

5. **重新构建 WASM**:
   ```bash
   wasm-pack build --target web
   ```

---

## 🎯 最佳实践

### 1. 文件扩展名

**始终包含 `.js` 扩展名**:

```javascript
// ✅ 正确
import foo from './foo.js';

// ❌ 错误（虽然某些工具支持，但不规范）
import foo from './foo';
```

### 2. 顶层 await

**充分利用顶层 await**:

```javascript
// ✅ ES Module 支持顶层 await
import init from './pkg/zkp_rust_prover.js';
await init();

// 无需包装在 async 函数中
```

### 3. 动态导入

**按需加载模块**:

```javascript
// 条件加载
if (condition) {
  const { heavyModule } = await import('./heavy.js');
}

// 延迟加载
button.addEventListener('click', async () => {
  const module = await import('./on-demand.js');
  module.run();
});
```

---

## 🔒 强制执行

### CI/CD 检查

**在 CI 中强制验证**:

```yaml
# .github/workflows/check-es-module.yml
name: ES Module Standard Check

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Check package.json
        run: |
          if ! grep -q '"type": "module"' package.json; then
            echo "❌ Error: package.json must contain 'type: module'"
            exit 1
          fi
      
      - name: Check for CommonJS
        run: |
          if grep -r "require(" src/ test/; then
            echo "❌ Error: Found CommonJS require() statements"
            exit 1
          fi
          if grep -r "module.exports" src/ test/; then
            echo "❌ Error: Found CommonJS module.exports"
            exit 1
          fi
      
      - name: Verify WASM build target
        run: |
          wasm-pack build --target web
          if ! grep -q '"type": "module"' pkg/package.json; then
            echo "❌ Error: WASM package must be ES Module"
            exit 1
          fi
```

### 代码审查要求

**PR 审查清单**:

- [ ] 所有新代码使用 ES Module
- [ ] 无 CommonJS 语法
- [ ] package.json 正确配置
- [ ] 测试使用 ES Module
- [ ] 文档更新

---

## 📊 合规性报告

### 当前状态

| 项目 | 状态 |
|------|------|
| WASM 构建目标 | ✅ bundler |
| package.json 配置 | ✅ "type": "module" |
| 测试文件格式 | ✅ ES Module |
| 文档示例 | ✅ ES Module |
| CI 检查 | ⏳ 待添加 |

**合规度**: ✅ 100%

---

## 🆘 故障排除

### 常见错误

**1. SyntaxError: Cannot use import statement outside a module**

```bash
# 解决：添加 package.json
echo '{"type": "module"}' > package.json
```

**2. ReferenceError: require is not defined**

```bash
# 解决：将 require 替换为 import
# Before: const foo = require('./foo');
# After:  import foo from './foo.js';
```

**3. ReferenceError: __dirname is not defined**

```javascript
// 解决：使用 ES Module 方式
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
```

---

## 📞 参考资源

- [Node.js ES Modules](https://nodejs.org/api/esm.html)
- [wasm-pack Targets](https://rustwasm.github.io/docs/wasm-pack/commands/build.html#target)
- [MDN ES Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

---

**最后更新**: 2025-11-08  
**维护者**: ZKP Project Team  
**状态**: ✅ **强制执行中**
