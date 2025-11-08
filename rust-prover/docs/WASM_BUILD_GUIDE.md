# WASM Build Guide

## ✅ 构建状态

**最近构建**: 2025-11-08  
**构建工具**: wasm-pack v0.12+  
**目标环境**: Node.js  
**构建结果**: ✅ 成功  

---

## 📦 构建产物

### 主要文件

构建成功后,`pkg/` 目录包含以下文件:

```
pkg/
├── zkp_rust_prover.js          (10 KB)  - JavaScript 绑定
├── zkp_rust_prover.d.ts        (383 B)  - TypeScript 类型定义
├── zkp_rust_prover_bg.wasm     (573 KB) - WASM 二进制文件
├── zkp_rust_prover_bg.wasm.d.ts (654 B) - WASM 类型定义
├── package.json                 (480 B)  - NPM 包配置
└── README.md                    (7 KB)   - 使用文档
```

### 文件说明

| 文件 | 大小 | 用途 |
|------|------|------|
| `zkp_rust_prover_bg.wasm` | 573 KB | 核心 WASM 模块（Halo2 电路实现） |
| `zkp_rust_prover.js` | 10 KB | JavaScript 接口封装 |
| `zkp_rust_prover.d.ts` | 383 B | TypeScript 类型声明 |
| `package.json` | 480 B | NPM 包元数据 |

---

## 🔧 构建命令

### 完整构建（推荐）

```bash
# ✅ Web 目标（推荐 - Node.js ESM + 浏览器通用）
wasm-pack build --target web

# ❌ Node.js 目标（不推荐 - 生成 CommonJS，无 init 导出）
# wasm-pack build --target nodejs

# Bundler 目标（Webpack/Rollup 等）
wasm-pack build --target bundler
```

**为什么使用 `--target web`？**
- ✅ 导出 `init()` 函数，支持手动 WASM 初始化
- ✅ 兼容 Node.js ESM（通过 `fs.readFileSync`）
- ✅ 兼容浏览器环境
- ✅ 生产级真实 ZK 证明系统
- ❌ `--target nodejs` 生成 CommonJS，不导出 `init`，与 ESM 不兼容

### 开发构建

```bash
# 开发模式（更快，未优化）
wasm-pack build --dev --target web

# 生产模式（默认，已优化）
wasm-pack build --release --target web
```

### 清理构建产物

```bash
# 清理 pkg 目录
rm -rf pkg/

# 清理 target 目录（完全清理）
cargo clean
```

---

## 📊 构建性能

### 构建时间

| 模式 | 时间 | 二进制大小 |
|------|------|----------|
| **Release（生产）** | ~10s | 573 KB |
| **Dev（开发）** | ~3s | ~800 KB |

### 优化选项

当前 `Cargo.toml` 已配置优化:

```toml
[profile.release]
opt-level = "z"        # 大小优化
lto = true             # 链接时优化
codegen-units = 1      # 单编译单元（更好优化）
```

---

## 🚀 使用 WASM 包

### 安装

```bash
# 从本地安装
npm install ../rust-prover/pkg

# 或从 NPM（发布后）
npm install zkp-rust-prover
```

### Node.js 中使用

```javascript
const zkp = require('zkp-rust-prover');

async function runProof() {
    // 设置日志级别
    zkp.setup_logging("info");
    
    // 生成证明
    const x = 5;  // 私密输入
    const y = 25; // 公开输出 (x²)
    
    const result = zkp.generate_proof(x, y);
    console.log("Proof generated:", result);
    
    // 验证证明
    const isValid = zkp.verify_proof(result, y);
    console.log("Verification:", isValid);
}

runProof().catch(console.error);
```

### TypeScript 中使用

```typescript
import * as zkp from 'zkp-rust-prover';

async function runProof(): Promise<void> {
    zkp.setup_logging("info");
    
    const x: number = 5;
    const y: number = 25;
    
    const proof: string = zkp.generate_proof(x, y);
    const isValid: boolean = zkp.verify_proof(proof, y);
    
    console.log(`Proof valid: ${isValid}`);
}
```

---

## ⚙️ 构建配置

### wasm-pack 配置

配置文件位于 `Cargo.toml`:

```toml
[lib]
crate-type = ["cdylib", "rlib"]

[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-Oz", "--enable-mutable-globals"]
```

### 目标环境说明

| Target | 用途 | 输出格式 |
|--------|------|---------|
| `nodejs` | Node.js 服务端 | CommonJS |
| `web` | 浏览器直接使用 | ES Module + async init |
| `bundler` | Webpack/Rollup | ES Module |
| `no-modules` | 浏览器无模块 | IIFE |

---

## 🐛 常见问题

### 1. 找不到 wasm-pack

**问题**:
```
command not found: wasm-pack
```

**解决**:
```bash
cargo install wasm-pack
```

### 2. 编译失败

**问题**:
```
error: linking with `rust-lld` failed
```

**解决**:
```bash
# 更新 Rust 工具链
rustup update

# 添加 wasm32 目标
rustup target add wasm32-unknown-unknown
```

### 3. LICENSE 警告

**问题**:
```
[INFO]: License key is set in Cargo.toml but no LICENSE file(s) were found
```

**解决**:
✅ 已创建 `LICENSE` 文件（MIT License）

### 4. 包大小过大

**问题**:
WASM 文件超过 1 MB

**解决**:
```toml
# Cargo.toml
[profile.release]
opt-level = "z"        # 使用 "z" 而不是 "3"
lto = true
strip = true           # 移除调试符号
```

---

## 📈 性能优化

### 编译时优化

1. **LTO（链接时优化）**: 已启用
2. **大小优化**: `opt-level = "z"`
3. **单编译单元**: `codegen-units = 1`

### 运行时优化

1. **预分配内存**: 在 WASM 中预分配大对象
2. **批量处理**: 减少 JS ↔ WASM 边界调用
3. **缓存密钥**: 重用 proving key 和 verifying key

---

## 🔐 安全注意事项

### 构建安全

1. ✅ **依赖审计**: 定期运行 `cargo audit`
2. ✅ **签名验证**: 发布到 NPM 时使用签名
3. ✅ **版本固定**: 使用确定的依赖版本

### 使用安全

1. ⚠️ **输入验证**: 始终验证用户输入
2. ⚠️ **范围检查**: 确保数值在有效范围内
3. ⚠️ **密钥管理**: 不要在客户端暴露私钥

---

## 📚 相关文档

- [Halo2 Book](https://zcash.github.io/halo2/)
- [wasm-pack 文档](https://rustwasm.github.io/wasm-pack/)
- [WebAssembly MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)
- 项目 README: `../README.md`
- 电路规范: `./CIRCUIT_SPECIFICATION.md`

---

## ✅ 验证清单

构建完成后,请验证:

- [ ] `pkg/` 目录存在
- [ ] WASM 文件 < 1 MB
- [ ] `package.json` 版本正确
- [ ] TypeScript 类型定义存在
- [ ] LICENSE 文件存在
- [ ] 示例代码可运行

---

**最后更新**: 2025-11-08  
**维护者**: ZKP Project Team  
**状态**: ✅ 生产就绪
