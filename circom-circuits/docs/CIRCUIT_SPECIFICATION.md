# Circom 电路规范文档

## 📋 文档目的

本文档定义 `circom-circuits` 模块中所有电路的设计、实现和审查标准。

## 🎯 核心原则

### 1. 生产环境电路与示例代码完全隔离

**规则:**
- `circuits/production/` - 仅包含生产级电路
- `circuits/examples/` - 仅包含学习/演示电路
- `circuits/tests/` - 仅包含测试辅助电路

**禁止:**
- ❌ 生产代码 import 示例目录
- ❌ 示例代码直接合并到生产
- ❌ 未标注用途的电路

### 2. 强制电路设计规范

每个电路**必须**在文件顶部包含以下声明：

```circom
// ============================================================================
// Circuit: [电路名称]
// ============================================================================
// 
// 用途: [简要说明]
// 状态: [✅ 生产 | 📚 示例 | 🔴 废弃]
// 
// 功能: [详细功能描述]
//
// 输入:
//   - signal_name: [private|public] ([witness|instance]) - [说明]
//
// 输出:
//   - signal_name: [private|public] ([witness|instance]) - [说明]
//
// 约束:
//   - [约束数量] 个 [类型] 门: [逻辑描述]
//
// 安全假设:
//   - [列举所有安全假设]
//
// 使用场景:
//   - [适用场景列表]
//
// ⚠️ 注意:
//   - [特殊注意事项]
//
// 作者: [作者]
// 版本: [版本号]
// 最后更新: [日期]
// ============================================================================
```

### 3. 约束不可省略原则

**必须遵守:**
- ✅ 每个约束必须有明确的逻辑意义
- ✅ 禁止使用硬编码值（除非有充分理由并注释）
- ✅ 禁止省略安全性关键的约束
- ✅ 所有中间信号必须有约束

**示例 - 正确:**
```circom
// ✅ 约束完整
signal diff;
diff <== x - lowerBound;

// 验证非负性（使用 Num2Bits）
component n2b = Num2Bits(32);
n2b.in <== diff;
```

**示例 - 错误:**
```circom
// ❌ 缺少非负性验证
signal diff;
diff <== x - lowerBound;

// ❌ 硬编码输出
valid <== 1;
```

## 🔍 电路分类标准

### 生产级电路 (Production)

**准入条件:**
1. ✅ 代码完整性
   - 所有信号类型明确声明
   - 所有约束逻辑完整
   - 无硬编码或魔法数字
   
2. ✅ 文档完整性
   - 符合规范的文件头
   - 详细的使用说明
   - 安全假设文档
   
3. ✅ 测试覆盖
   - 单元测试覆盖率 >= 90%
   - 边界情况测试
   - 无效输入测试
   
4. ✅ 审查流程
   - 至少 2 人代码审查
   - 安全审查通过
   - CI 检查通过

### 示例电路 (Examples)

**准入条件:**
1. ✅ 逻辑正确性验证
2. ✅ 基本文档（用途、输入输出）
3. ✅ 明确标注"示例"状态
4. ❌ 不要求完整安全审查

### 废弃电路 (Deprecated)

**命名规范:**
- 文件名必须以 `DEPRECATED_` 开头
- 在文件头明确标注缺陷
- 禁用主组件（注释掉 `component main`）

## 📝 电路模板

### 生产级电路模板

```circom
// ============================================================================
// Circuit: MyProductionCircuit
// ============================================================================
// 
// 用途: [简要说明]
// 状态: ✅ 生产级
// 
// 功能: [详细功能描述]
//
// 输入:
//   - x: private (witness) - [说明]
//   - y: public (instance) - [说明]
//
// 输出:
//   - result: public (instance) - [说明]
//
// 约束:
//   - N 个乘法门
//   - M 个加法约束
//
// 约束数量: [总数]
//
// 安全假设:
//   - 标准 Groth16 假设
//   - 受信任的 Setup
//   - [其他假设]
//
// Gas 消耗 (链上验证):
//   - 约 [数值] gas
//
// 使用场景:
//   - [场景1]
//   - [场景2]
//
// 限制:
//   - [限制1]
//   - [限制2]
//
// 作者: [作者]
// 审查人: [审查人1], [审查人2]
// 版本: 1.0.0
// 最后更新: [日期]
// 审查日期: [日期]
// ============================================================================

pragma circom 2.0.0;

include "circomlib/poseidon.circom";  // 使用标准库

template MyProductionCircuit(n) {
    // 输入声明
    signal input x;
    signal input y;
    
    // 输出声明
    signal output result;
    
    // 中间信号
    signal intermediate;
    
    // 约束逻辑
    intermediate <== x * x;
    result <== intermediate + y;
}

component main = MyProductionCircuit(8);
```

### 示例电路模板

```circom
// ============================================================================
// Circuit: MyExampleCircuit (示例电路)
// ============================================================================
// 
// 用途: 学习和演示 [主题]
// 状态: 📚 示例代码
// 
// 功能: [简要说明]
//
// 输入:
//   - a: private - [说明]
//   - b: private - [说明]
//
// 输出:
//   - c: public - [说明]
//
// ⚠️ 注意:
//   - 此为示例电路，已验证逻辑正确性
//   - 可安全用于学习和测试
//   - 生产使用需要额外的安全审查
//
// 作者: [作者]
// 版本: 1.0.0
// 最后更新: [日期]
// ============================================================================

pragma circom 2.0.0;

template MyExampleCircuit() {
    signal input a;
    signal input b;
    signal output c;
    
    c <== a + b;
}

component main = MyExampleCircuit();
```

## 🧪 测试要求

### 生产级电路测试

每个生产级电路必须提供：

1. **正常情况测试**
   ```javascript
   it('should prove valid computation', async () => {
       const input = { x: 5, y: 10 };
       const { proof, publicSignals } = await prove(input);
       const verified = await verify(proof, publicSignals);
       expect(verified).toBe(true);
   });
   ```

2. **边界情况测试**
   ```javascript
   it('should handle zero input', async () => {
       const input = { x: 0, y: 0 };
       // ... 测试逻辑
   });
   
   it('should handle maximum value', async () => {
       const input = { x: MAX_VALUE, y: MAX_VALUE };
       // ... 测试逻辑
   });
   ```

3. **无效输入测试**
   ```javascript
   it('should reject invalid witness', async () => {
       const input = { x: -1, y: 10 };  // 负数
       await expect(prove(input)).rejects.toThrow();
   });
   ```

### 示例电路测试

- 至少提供基本的正确性验证测试

## 🔒 安全检查清单

### 代码级检查

- [ ] 无硬编码值（除非有充分理由）
- [ ] 无魔法数字
- [ ] 所有约束逻辑完整
- [ ] 无可绕过的约束
- [ ] 使用安全的密码学原语（Poseidon, MiMC 等）
- [ ] 避免使用不安全的哈希（如平方、简单加法）

### 逻辑级检查

- [ ] 输入范围验证
- [ ] 溢出保护
- [ ] 边界条件处理
- [ ] 错误处理机制

### 文档级检查

- [ ] 输入/输出类型明确
- [ ] 安全假设完整
- [ ] 限制条件清晰
- [ ] 使用示例正确

## 📊 性能优化指南

### 约束数量优化

- 尽量减少约束数量
- 合并相似约束
- 使用高效的模板（circomlib）

### Gas 优化

- 优化公共输入数量
- 使用批量验证
- 考虑 Solidity verifier 的 gas 消耗

## 🚫 常见错误模式

### 1. 硬编码输出

```circom
// ❌ 错误
template Bad() {
    signal output valid;
    valid <== 1;  // 任何输入都返回 true！
}

// ✅ 正确
template Good() {
    signal input x;
    signal output valid;
    
    component checker = RangeCheck(8);
    checker.in <== x;
    valid <== checker.out;
}
```

### 2. 缺少约束

```circom
// ❌ 错误
template Bad() {
    signal input x;
    signal input y;
    signal output result;
    
    signal diff;
    diff <== x - y;  // 没有验证 diff 的有效性！
    result <== 1;
}

// ✅ 正确
template Good() {
    signal input x;
    signal input y;
    signal output result;
    
    component lt = LessThan(8);
    lt.in[0] <== y;
    lt.in[1] <== x;
    result <== lt.out;
}
```

### 3. 不安全的哈希

```circom
// ❌ 错误
template BadHash() {
    signal input preimage;
    signal output hash;
    hash <== preimage * preimage;  // 不安全！
}

// ✅ 正确
template GoodHash() {
    signal input preimage;
    signal output hash;
    
    component hasher = Poseidon(1);
    hasher.inputs[0] <== preimage;
    hash <== hasher.out;
}
```

## 🔄 版本控制

- 电路版本号遵循 Semantic Versioning
- 重大更改必须更新主版本号
- 保持向后兼容性（或明确标注破坏性更改）

## 📞 获取帮助

- 查阅 [Circom 官方文档](https://docs.circom.io/)
- 参考 [circomlib 实现](https://github.com/iden3/circomlib)
- 提交 Issue 或联系团队

---

**文档版本:** 1.0.0  
**最后更新:** 2025-11-08  
**维护者:** ZKP Project Team
