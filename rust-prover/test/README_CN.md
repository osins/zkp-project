# 🧪 WASM 零知识证明测试套件

本目录包含 Rust WASM 零知识证明模块的完整测试套件和文档。

---

## 📁 目录结构

```
test/
├── test-wasm.js              # ⭐ 完整测试套件（15个测试）
├── test-simple.js            # 🔍 简单调试测试
├── test-results.txt          # 📊 最新测试输出结果
├── README.md                 # 📖 本文件 - 测试套件说明
└── WASM_TEST_SUCCESS.md      # 📋 详细测试报告
```

---

## 🚀 快速开始

### 运行测试

```bash
# 从项目根目录运行完整测试
cd rust-prover
node test/test-wasm.js

# 运行简单测试
node test/test-simple.js
```

**预期输出：**
```
🎉 所有测试通过！WASM 模块工作正常！
✅ 通过测试: 15
❌ 失败测试: 0
📈 成功率: 100.00%
```

### 编译 WASM

```bash
cd rust-prover
wasm-pack build --target nodejs
```

---

## 📊 测试概览

### test-wasm.js - 完整测试套件 ⭐

**15 个测试用例，覆盖：**

1. **证明生成功能** (6 个测试)
   - ✅ 常规输入值测试 (5, 10, 42, 100)
   - ✅ 边界值测试 (0, 1)

2. **证明验证功能** (6 个测试)
   - ✅ 验证所有生成的证明

3. **安全性测试** (2 个测试)
   - ✅ 篡改证明拒绝测试
   - ✅ 空数据拒绝测试

4. **性能测试** (1 个测试)
   - ✅ 基准测试（5轮重复）

**测试结果：**
```
✅ 通过测试: 15
❌ 失败测试: 0
📈 成功率: 100.00%
```

---

### test-simple.js - 简单测试 🔍

最小化的测试脚本，用于：
- 快速验证基本功能
- 调试问题
- 获取详细错误堆栈

**示例输出：**
```
测试 WASM 模块...

步骤 1: 生成证明，输入值 = 5
✅ 证明生成成功
证明大小: 1312 字节

步骤 2: 验证证明
验证结果: ✅ 有效
```

---

## 💡 使用示例

### 基本用法

```javascript
const { wasm_generate_proof, wasm_verify_proof } = require('../pkg/rust_prover.js');

// 生成证明
const proof = wasm_generate_proof(42);
console.log('证明大小:', proof.length); // 1312 字节

// 验证证明
const isValid = wasm_verify_proof(proof);
console.log('有效:', isValid); // true
```

### 错误处理

```javascript
const { wasm_generate_proof, wasm_verify_proof } = require('../pkg/rust_prover.js');

try {
    const proof = wasm_generate_proof(100);
    
    if (wasm_verify_proof(proof)) {
        console.log('✅ 证明有效');
    } else {
        console.log('❌ 证明无效');
    }
} catch (error) {
    console.error('错误:', error.message);
}
```

### 篡改检测

```javascript
const { wasm_generate_proof, wasm_verify_proof } = require('../pkg/rust_prover.js');

// 生成有效证明
const validProof = wasm_generate_proof(42);
console.log('有效证明:', wasm_verify_proof(validProof)); // true

// 篡改证明
const tamperedProof = new Uint8Array(validProof);
tamperedProof[0] = tamperedProof[0] ^ 0xFF;

console.log('篡改证明:', wasm_verify_proof(tamperedProof)); // false
```

---

## 📈 性能指标

| 操作 | 平均耗时 | 数据大小 |
|------|---------|---------|
| 证明生成 | ~840 ms | 1312 字节 |
| 证明验证 | ~600 ms | - |
| WASM 模块 | - | 746 KB |

---

## 📖 相关文档

### WASM_TEST_SUCCESS.md
- 📊 详细测试结果
- 📈 完整性能指标
- 🔧 技术实现细节

---

## 🎯 使用场景

### 1. 开发调试
```bash
# 快速验证功能
node test/test-simple.js
```

### 2. 完整测试
```bash
# 运行所有测试
node test/test-wasm.js
```

### 3. 性能测试
```bash
# 查看性能指标
node test/test-wasm.js | grep "平均"
```

### 4. 保存测试结果
```bash
node test/test-wasm.js > test/test-results.txt 2>&1
```

---

## 🔧 开发工作流

### 1. 修改代码
```bash
# 编辑源代码
vim ../src/lib.rs
vim ../src/circuit.rs
```

### 2. 重新编译
```bash
cd ..
wasm-pack build --target nodejs
```

### 3. 运行测试
```bash
# 快速测试
node test/test-simple.js

# 完整测试
node test/test-wasm.js
```

### 4. 检查结果
```bash
# 查看详细结果
cat test/test-results.txt
```

---

## 🆘 故障排查

### 测试失败？

```bash
# 1. 清理并重新编译
cd rust-prover
cargo clean
wasm-pack build --target nodejs

# 2. 运行简单测试获取详细错误
node test/test-simple.js
```

### 找不到模块？

确保从正确的目录运行：
```bash
# 正确 ✅
cd rust-prover
node test/test-wasm.js

# 错误 ❌
cd rust-prover/test
node test-wasm.js  # 找不到 ../pkg/rust_prover.js
```

### 编译错误？

```bash
# 检查 Rust 版本
rustc --version  # 需要 1.70+

# 检查 wasm-pack
wasm-pack --version

# 重新安装依赖
cd rust-prover
cargo update
```

---

## 📝 添加新测试

在 `test-wasm.js` 中添加测试用例：

```javascript
// 在适当的测试部分添加
try {
    console.log('\n[测试 X] 您的测试描述');
    
    // 测试逻辑
    const proof = wasm_generate_proof(yourValue);
    
    if (/* 检查条件 */) {
        console.log('  ✅ 测试通过');
        passedTests++;
    } else {
        console.log('  ❌ 测试失败');
        failedTests++;
    }
} catch (error) {
    console.log('  ❌ 异常:', error.message);
    failedTests++;
}
```

---

## ✅ 测试检查清单

在提交代码前，确保：

- [ ] `node test/test-simple.js` 通过
- [ ] `node test/test-wasm.js` 显示 100% 通过率
- [ ] 没有编译警告
- [ ] 性能指标在预期范围内
- [ ] 文档已更新

---

## 📞 相关资源

- **主项目 README**: `../README.md`
- **源代码**: `../src/`
- **编译输出**: `../pkg/`
- **依赖配置**: `../Cargo.toml`
- **更新日志**: `../CHANGELOG.md`

---

**✨ 祝测试愉快！**
- 📝 完整测试说明
- ⚠️ 已知问题
- 🔮 未来改进方向

---

## 🎯 使用示例

### 基本用法

```javascript
const { wasm_generate_proof, wasm_verify_proof } = require('../pkg/rust_prover.js');

// 生成证明
const proof = wasm_generate_proof(42);
console.log('证明大小:', proof.length); // 1312 字节

// 验证证明
const isValid = wasm_verify_proof(proof);
console.log('有效:', isValid); // true
```

### 完整示例

```javascript
const { wasm_generate_proof, wasm_verify_proof } = require('../pkg/rust_prover.js');

try {
    console.log('生成零知识证明...');
    const secretNumber = 42;
    const proof = wasm_generate_proof(secretNumber);
    
    console.log(`✅ 证明生成成功！`);
    console.log(`   大小: ${proof.length} 字节`);
    
    console.log('\n验证证明...');
    const isValid = wasm_verify_proof(proof);
    
    if (isValid) {
        console.log('✅ 证明有效！');
        console.log('   证明者知道某个数的平方，但无需透露该数。');
    } else {
        console.log('❌ 证明无效！');
    }
} catch (error) {
    console.error('错误:', error.message);
}
```

---

## 📈 性能指标

| 操作 | 平均耗时 | 数据大小 |
|------|---------|---------|
| 证明生成 | ~840 ms | 1312 字节 |
| 证明验证 | ~600 ms | - |
| WASM 模块 | - | 746 KB |

---

## 🔧 开发工作流

### 1. 修改代码
```bash
# 编辑 src/lib.rs 或 src/circuit.rs
```

### 2. 重新编译
```bash
cd rust-prover
wasm-pack build --target nodejs
```

### 3. 运行测试
```bash
# 快速测试
node test/test-simple.js

# 完整测试
node test/test-wasm.js
```

### 4. 查看结果
```bash
# 保存测试结果
node test/test-wasm.js > test/test-results.txt 2>&1

# 查看结果
cat test/test-results.txt
```

---

## ✅ 测试检查清单

在提交代码前，确保：

- [ ] `node test/test-simple.js` 通过
- [ ] `node test/test-wasm.js` 显示 100% 通过率
- [ ] 没有编译警告
- [ ] 性能指标在预期范围内
- [ ] 文档已更新

---

## 🆘 故障排查

### 测试失败？

```bash
# 1. 清理并重新编译
cd rust-prover
cargo clean
wasm-pack build --target nodejs

# 2. 运行简单测试获取详细错误
node test/test-simple.js
```

### 找不到模块？

确保从正确的目录运行：
```bash
# 正确 ✅
cd rust-prover
node test/test-wasm.js

# 错误 ❌
cd rust-prover/test
node test-wasm.js  # 找不到 ../pkg/rust_prover.js
```

---

## 📝 贡献指南

添加新测试时：

1. 在 `test-wasm.js` 中添加测试用例
2. 运行完整测试套件确保通过
3. 更新相关文档
4. 保存新的测试结果到 `test-results.txt`

---

## 📞 相关资源

- **主项目 README**: `../README.md`
- **源代码**: `../src/`
- **编译输出**: `../pkg/`
- **构建脚本**: `../build_wasm.sh`

---

**✨ 祝测试愉快！**
