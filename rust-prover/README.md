# 🦀 Rust WASM 零知识证明模块

基于 Halo2 的零知识证明库，编译为 WebAssembly，可在 Node.js 和浏览器中使用。

[![Tests](https://img.shields.io/badge/tests-15%2F15%20passed-brightgreen)]()
[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![WASM](https://img.shields.io/badge/wasm-ready-blue)]()

---

## 📁 项目结构

```
rust-prover/
├── src/                    # 📝 源代码
│   ├── lib.rs             #    WASM 接口和核心逻辑
│   └── circuit.rs         #    Halo2 电路定义
│
├── test/                   # 🧪 测试套件
│   ├── test-wasm.js       #    完整测试 (15个测试)
│   ├── test-simple.js     #    简单测试
│   ├── test-results.txt   #    测试结果
│   ├── README.md          #    测试说明（含快速开始）
│   └── WASM_TEST_SUCCESS.md   # 测试报告
│
├── pkg/                    # 📦 WASM 编译输出
│   ├── rust_prover.js     #    JavaScript 接口
│   ├── rust_prover_bg.wasm    # WASM 二进制 (746 KB)
│   └── rust_prover.d.ts   #    TypeScript 类型定义
│
├── Cargo.toml              # 🔧 Rust 依赖配置
└── build_wasm.sh           # 🔨 构建脚本
```

---

## 🚀 快速开始

### 1. 编译 WASM 模块

```bash
cd rust-prover
wasm-pack build --target nodejs
```

### 2. 运行测试

```bash
# 完整测试套件
node test/test-wasm.js

# 快速测试
node test/test-simple.js
```

### 3. 使用模块

```javascript
const { wasm_generate_proof, wasm_verify_proof } = require('./pkg/rust_prover.js');

// 生成零知识证明
const proof = wasm_generate_proof(42);
console.log('证明大小:', proof.length); // 1312 字节

// 验证证明
const isValid = wasm_verify_proof(proof);
console.log('验证结果:', isValid); // true
```

---

## ✨ 功能特性

- ✅ **零知识性**: 证明知识而不泄露信息
- ✅ **高性能**: 生成 ~840ms，验证 ~600ms
- ✅ **跨平台**: 支持 Node.js 和浏览器
- ✅ **类型安全**: 提供 TypeScript 类型定义
- ✅ **完整测试**: 15 个测试用例，100% 通过

---

## 🔧 技术栈

| 组件 | 技术 |
|------|------|
| ZKP 库 | Halo2 Proofs v0.3.1 |
| 椭圆曲线 | Pallas (pasta_curves) |
| 哈希函数 | Blake2b |
| WASM 绑定 | wasm-bindgen |
| 电路 | SquareCircuit (y = x²) |

---

## 📊 性能指标

| 操作 | 耗时 | 大小 |
|------|------|------|
| 证明生成 | ~840 ms | 1312 字节 |
| 证明验证 | ~600 ms | - |
| WASM 模块 | - | 746 KB |

---

## 📖 文档

- **[测试说明](test/README.md)** - 测试套件说明和快速开始
- **[测试报告](test/WASM_TEST_SUCCESS.md)** - 完整测试结果

---

## 🧪 测试

### 运行测试

```bash
# 完整测试（推荐）
node test/test-wasm.js

# 快速测试
node test/test-simple.js

# 保存测试结果
node test/test-wasm.js > test/test-results.txt 2>&1
```

### 测试覆盖

- ✅ 证明生成 (6 个测试)
- ✅ 证明验证 (6 个测试)
- ✅ 安全性测试 (2 个测试)
- ✅ 性能测试 (1 个测试)

**结果**: 15/15 通过 ✅

---

## 🔨 开发

### 安装依赖

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 wasm-pack
cargo install wasm-pack
```

### 构建

```bash
# 开发构建
wasm-pack build --dev --target nodejs

# 生产构建
wasm-pack build --target nodejs

# 浏览器构建
wasm-pack build --target web
```

### 开发工作流

```bash
# 1. 修改代码
vim src/lib.rs

# 2. 重新编译
wasm-pack build --target nodejs

# 3. 运行测试
node test/test-wasm.js
```

---

## 💡 使用示例

### Node.js

```javascript
const { wasm_generate_proof, wasm_verify_proof } = require('./pkg/rust_prover.js');

try {
    // 生成证明
    const secretValue = 100;
    const proof = wasm_generate_proof(secretValue);
    
    console.log('✅ 证明生成成功');
    console.log('证明大小:', proof.length, '字节');
    
    // 验证证明
    const isValid = wasm_verify_proof(proof);
    console.log('验证结果:', isValid ? '✅ 有效' : '❌ 无效');
    
} catch (error) {
    console.error('错误:', error.message);
}
```

### 浏览器

```html
<!DOCTYPE html>
<html>
<head>
    <title>ZKP Demo</title>
</head>
<body>
    <script type="module">
        import init, { wasm_generate_proof, wasm_verify_proof } 
            from './pkg/rust_prover.js';
        
        async function demo() {
            await init();
            
            const proof = wasm_generate_proof(42);
            const isValid = wasm_verify_proof(proof);
            
            console.log('Valid:', isValid);
        }
        
        demo();
    </script>
</body>
</html>
```

---

## 🔐 安全性

### 已验证的安全特性

- ✅ **防篡改**: 修改证明会导致验证失败
- ✅ **输入验证**: 拒绝空数据和无效输入
- ✅ **零知识**: 不泄露原始输入值
- ✅ **可验证**: 任何人都可以验证证明

### 安全测试结果

```
✅ 篡改证明检测: 通过
✅ 空数据拒绝: 通过
✅ 验证一致性: 通过
```

---

## 📦 依赖

### Rust Crates

```toml
[dependencies]
halo2_proofs = "0.3.1"
halo2curves = "0.9.0"
wasm-bindgen = "0.2"
rand = "0.8"
getrandom = { version = "0.2", features = ["js"] }
console_error_panic_hook = "0.1"
```

### 系统要求

- **Rust**: 1.70+
- **wasm-pack**: 最新版
- **Node.js**: 14+ (用于测试)

---

## 🐛 故障排查

### 编译失败？

```bash
# 清理并重新构建
cargo clean
wasm-pack build --target nodejs
```

### 测试失败？

```bash
# 运行简单测试获取详细错误
node test/test-simple.js
```

### 找不到模块？

```bash
# 确保从正确目录运行
cd rust-prover
node test/test-wasm.js
```

---

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### 提交前检查

- [ ] 代码通过 `cargo fmt` 格式化
- [ ] 通过 `cargo clippy` 检查
- [ ] 所有测试通过 (`node test/test-wasm.js`)
- [ ] 文档已更新

---

## 📄 许可证

查看项目根目录的 LICENSE 文件。

---

## 🎉 致谢

- [Halo2](https://github.com/zcash/halo2) - 零知识证明库
- [wasm-bindgen](https://github.com/rustwasm/wasm-bindgen) - Rust WASM 绑定
- [pasta_curves](https://github.com/zcash/pasta_curves) - Pallas/Vesta 曲线

---

## 📞 支持

遇到问题？

1. 查看 [测试文档](test/README.md)
2. 查看 [快速开始](test/QUICK_START.md)
3. 运行 `node test/test-simple.js` 获取详细错误

---

**✨ 开始使用零知识证明吧！**
