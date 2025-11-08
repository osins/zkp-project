# 迁移指南 - Circom Circuits v2.0.0

## 📋 概述

本文档指导您从 v1.0.0 迁移到 v2.0.0。v2.0.0 是一次重大重构，引入了严格的生产环境电路规范。

## ⚠️ 重大变更

### 1. 目录结构变更

**旧结构** (v1.0.0):
```
circuits/
└── example.circom  # 包含所有电路模板
```

**新结构** (v2.0.0):
```
circuits/
├── production/     # 生产级电路（空）
├── examples/       # 示例电路
│   ├── multiplier.circom
│   ├── DEPRECATED_range_proof_broken.circom
│   └── DEPRECATED_hash_verifier_insecure.circom
└── tests/          # 测试辅助电路
```

### 2. 电路状态变更

| 电路 | v1.0.0 状态 | v2.0.0 状态 | 原因 |
|------|-------------|-------------|------|
| Multiplier | 示例 | ✅ 可用示例 | 逻辑正确 |
| RangeProof | 示例 | 🔴 已废弃 | 硬编码输出，约束失效 |
| HashVerifier | 示例 | 🔴 已废弃 | 使用不安全的哈希函数 |

### 3. 构建命令变更

**旧命令**:
```bash
npm run build     # 构建 example.circom
npm run test      # 运行测试
```

**新命令**:
```bash
npm run build:example multiplier  # 构建特定示例
npm test                          # 运行完整测试套件
npm run lint                      # 运行代码检查
```

## 🔧 迁移步骤

### 步骤 1: 更新依赖

```bash
cd circom-circuits
npm install
```

### 步骤 2: 审查现有电路使用

**检查您的代码中是否使用了废弃的电路**:

```bash
# 搜索 RangeProof 使用
grep -r "RangeProof" ../

# 搜索 HashVerifier 使用
grep -r "HashVerifier" ../
```

**如果发现使用**:
- ⛔ **立即停止使用** RangeProof 和 HashVerifier
- 📋 查看替代方案（见下文）

### 步骤 3: 迁移电路引用

#### 如果您使用了 Multiplier

✅ **Multiplier 仍然可用**，但需要更新构建命令：

**旧代码**:
```javascript
// 引用旧的 build 输出
const wasmFile = "build/example.wasm";
const zkeyFile = "build/example_final.zkey";
```

**新代码**:
```javascript
// 引用新的 build 输出
const wasmFile = "build/multiplier_js/multiplier.wasm";
const zkeyFile = "build/multiplier_final.zkey";
```

**构建**:
```bash
npm run build:example multiplier
```

#### 如果您使用了 RangeProof

🔴 **RangeProof 已被废弃**，必须替换。

**问题**:
- 硬编码输出 `valid <== 1`
- 无有效的范围检查

**替代方案**:

**选项 1: 使用 circomlib 的 LessThan**
```circom
include "circomlib/comparators.circom";

template RangeProofCorrect(n) {
    signal input x;
    signal input lowerBound;
    signal input upperBound;
    signal output valid;
    
    // x >= lowerBound
    component gte = GreaterEqThan(n);
    gte.in[0] <== x;
    gte.in[1] <== lowerBound;
    
    // x <= upperBound
    component lte = LessEqThan(n);
    lte.in[0] <== x;
    lte.in[1] <== upperBound;
    
    // 两个条件都满足
    valid <== gte.out * lte.out;
}
```

**选项 2: 使用位分解验证**
```circom
include "circomlib/bitify.circom";

template RangeProofBitwise(n) {
    signal input x;
    signal output valid;
    
    // 验证 x 可以用 n 位表示
    component n2b = Num2Bits(n);
    n2b.in <== x;
    
    valid <== 1;  // 如果能转换为 n 位，则有效
}
```

#### 如果您使用了 HashVerifier

🔴 **HashVerifier 已被废弃**，必须替换。

**问题**:
- 使用平方作为哈希 (`hash <== preimage * preimage`)
- 不安全：可逆、碰撞风险

**替代方案**:

**选项 1: 使用 Poseidon（推荐）**
```circom
include "circomlib/poseidon.circom";

template HashVerifierCorrect() {
    signal input preimage;
    signal input expectedHash;
    signal output valid;
    
    component hasher = Poseidon(1);
    hasher.inputs[0] <== preimage;
    
    // 验证哈希匹配
    valid <== IsEqual()([hasher.out, expectedHash]);
}
```

**选项 2: 使用 MiMC**
```circom
include "circomlib/mimc.circom";

template HashVerifierMiMC() {
    signal input preimage;
    signal input expectedHash;
    
    component hasher = MiMCSponge(1, 220, 1);
    hasher.ins[0] <== preimage;
    hasher.k <== 0;
    
    expectedHash === hasher.outs[0];
}
```

### 步骤 4: 更新测试

**旧测试**:
```javascript
const wasmFile = "build/example.wasm";
const zkeyFile = "build/example_final.zkey";
```

**新测试**:
```javascript
const circuitName = "multiplier";  // 或您的电路名
const wasmFile = `build/${circuitName}_js/${circuitName}.wasm`;
const zkeyFile = `build/${circuitName}_final.zkey`;
const vkeyFile = `build/${circuitName}_verification_key.json`;
```

### 步骤 5: 更新 CI/CD

**旧 CI 配置**:
```yaml
- run: npm run build
- run: npm test
```

**新 CI 配置**:
```yaml
- run: npm run build:example multiplier
- run: npm test
- run: npm run lint        # 新增
- run: npm run security    # 新增
```

### 步骤 6: 清理旧的 build 输出

```bash
npm run clean
```

## 📋 检查清单

完成迁移后，请检查：

- [ ] 已删除所有对 RangeProof 的引用
- [ ] 已删除所有对 HashVerifier 的引用
- [ ] 已更新所有电路文件路径
- [ ] 已更新所有测试文件
- [ ] 所有测试通过 (`npm test`)
- [ ] Lint 检查通过 (`npm run lint`)
- [ ] 安全检查通过 (`npm run security`)
- [ ] CI/CD 配置已更新

## 🚨 常见问题

### Q1: 我可以继续使用 RangeProof 吗？

**A**: ❌ **不可以**。RangeProof 存在严重缺陷（硬编码输出），无法提供任何安全保证。必须使用上述替代方案。

### Q2: 我的代码依赖 example.circom，怎么办？

**A**: `example.circom` 已被拆分为独立的电路文件。请：
1. 识别您使用的具体模板（Multiplier/RangeProof/HashVerifier）
2. 参考上述迁移步骤更新代码
3. 废弃的电路必须替换为安全实现

### Q3: 新的构建输出在哪里？

**A**: 
```
build/
├── multiplier.r1cs
├── multiplier_js/
│   └── multiplier.wasm
├── multiplier_final.zkey
├── multiplier_verification_key.json
└── multiplier_Verifier.sol
```

每个电路都有独立的输出文件。

### Q4: 我需要重新生成所有证明吗？

**A**: 是的，如果您之前使用了废弃的电路。

### Q5: 如何验证迁移成功？

**A**: 运行完整的测试和检查：
```bash
npm test              # 所有测试通过
npm run lint          # Lint 通过
npm run security      # 安全检查通过
```

## 🔒 安全提示

1. **立即停止使用**:
   - ❌ RangeProof（硬编码输出）
   - ❌ HashVerifier（不安全哈希）

2. **使用推荐的库**:
   - ✅ circomlib/poseidon.circom
   - ✅ circomlib/comparators.circom
   - ✅ circomlib/bitify.circom

3. **审查所有电路**:
   - 确保没有硬编码值
   - 确保约束完整
   - 确保使用安全的密码学原语

## 📞 获取帮助

如果迁移遇到问题：

1. 查阅文档：
   - `docs/CIRCUIT_SPECIFICATION.md`
   - `docs/REVIEW_CHECKLIST.md`

2. 运行诊断：
   ```bash
   npm run lint
   npm run security
   ```

3. 提交 Issue:
   - 描述您的使用场景
   - 附上错误信息

## ✅ 迁移完成

迁移完成后，您应该：

- ✅ 不再使用任何废弃的电路
- ✅ 所有测试通过
- ✅ 所有检查通过
- ✅ 代码符合新的规范

---

**版本**: 2.0.0  
**发布日期**: 2025-11-08  
**维护者**: ZKP Project Team
