# Rust Prover 电路映射文档

## 概述

本文档说明 `rust-prover` 模块如何实现 `circom-circuits` 中的电路接口。

**创建日期**: 2025-11-08  
**版本**: 1.0.0

---

## 电路对应关系

### 1. ✅ SquareCircuit (平方电路)

**状态**: 生产级 (Production Ready)

**Circom 对应**: 基础示例电路

**功能**: 证明知道私密值 x，使得公开值 y = x²

**接口**:
- **输入 (Private)**: `x: Option<Fp>`
- **输出 (Public)**: `y: Fp`

**文件**: `src/circuits/square.rs`

**测试覆盖率**: 100%

**用法示例**:
```rust
use zkp_rust_prover::SquareCircuit;
use halo2_proofs::pasta::Fp;

let circuit = SquareCircuit { x: Some(Fp::from(5)) };
// 生成证明...
```

---

### 2. 🟡 RangeProofCircuit (范围证明电路)

**状态**: 生产级 (Production Ready)

**Circom 对应**: `circuits/production/range_proof.circom`

**功能**: 证明私密值 x 在范围 [0, 2^N) 内

**接口**:
- **输入 (Private)**: `value: Option<u64>`
- **参数**: `N: usize` (位数)
- **输出 (Public)**: `valid: Fp` (始终为 1)

**文件**: `src/circuits/range_proof.rs`

**测试覆盖率**: 100%

**约束数量**: N + 1 (N 个位约束 + 1 个重构约束)

**用法示例**:
```rust
use zkp_rust_prover::RangeProofCircuit;

// 证明值在 [0, 256) 范围内
let circuit = RangeProofCircuit::<8> { value: Some(100) };
```

---

### 3. 🔶 AgeVerificationCircuit (年龄验证电路)

**状态**: 基础框架 (Basic Framework)

**Circom 对应**: `circuits/production/age_verification.circom`

**功能**: 证明年龄在指定范围内 [minAge, maxAge]

**接口**:
- **输入 (Private)**: `age: Option<u64>`
- **输入 (Public)**: `min_age: Option<u64>`, `max_age: Option<u64>`
- **输出 (Public)**: `valid: Fp`

**文件**: `src/circuits/age_verification.rs`

**当前限制**: 
- ⚠️ 范围约束未完全实现
- 需要添加完整的比较逻辑
- 建议使用 RangeProofCircuit 作为基础

**TODO**:
- [ ] 实现完整的范围检查约束
- [ ] 添加承诺方案
- [ ] 完善测试用例

---

### 4. 🔶 BalanceProofCircuit (余额证明电路)

**状态**: 基础框架 (Basic Framework)

**Circom 对应**: `circuits/production/balance_proof.circom`

**功能**: 证明余额 >= requiredAmount

**接口**:
- **输入 (Private)**: `balance: Option<u64>`
- **输入 (Public)**: `required_amount: Option<u64>`
- **输出 (Public)**: `sufficient: Fp`

**文件**: `src/circuits/balance_proof.rs`

**测试状态**: ✅ 基础测试通过

**TODO**:
- [ ] 实现完整的比较约束
- [ ] 添加承诺方案
- [ ] 支持账户 ID

---

### 5. 🔶 MerkleProofCircuit (默克尔树证明电路)

**状态**: 基础框架 (Basic Framework)

**Circom 对应**: `circuits/production/merkle_proof.circom`

**功能**: 证明叶子节点在默克尔树中

**接口**:
- **输入 (Private)**: `leaf: Option<Fp>`
- **输入 (Public)**: `root: Option<Fp>`
- **输出 (Public)**: `root: Fp`

**文件**: `src/circuits/merkle_proof.rs`

**测试状态**: ✅ 基础测试通过

**TODO**:
- [ ] 实现 Poseidon 哈希
- [ ] 添加路径验证逻辑
- [ ] 支持可配置树深度

---

### 6. 🔶 VotingCircuit (投票电路)

**状态**: 基础框架 (Basic Framework)

**Circom 对应**: `circuits/production/voting_circuit.circom`

**功能**: 匿名投票，防止双重投票

**接口**:
- **输入 (Private)**: `voter_secret: Option<Fp>`, `vote: Option<u8>`
- **输入 (Public)**: `merkle_root: Option<Fp>`
- **输出 (Public)**: `vote_hash: Fp`

**文件**: `src/circuits/voting.rs`

**测试状态**: ✅ 基础测试通过

**TODO**:
- [ ] 实现默克尔树验证
- [ ] 添加废止符生成
- [ ] 实现投票加密

---

## 统一接口 - CircuitAdapter

**文件**: `src/adapters/circuit_adapter.rs`

**功能**: 提供统一的接口来使用所有电路

**用法示例**:
```rust
use zkp_rust_prover::{CircuitAdapter, CircuitType};

let adapter = CircuitAdapter::new();

// 列出所有可用电路
let circuits = adapter.list_circuits();

// 获取电路信息
let info = adapter.get_circuit_info(CircuitType::Square);
println!("{}: {}", info.name, info.description);
```

---

## 测试状态总结

| 电路 | 状态 | 测试通过率 |
|------|------|-----------|
| SquareCircuit | ✅ 生产级 | 100% (5/5) |
| RangeProofCircuit | ✅ 生产级 | 100% (3/3) |
| AgeVerificationCircuit | 🔶 框架 | 0% (0/1) ⚠️ |
| BalanceProofCircuit | 🔶 框架 | 100% (1/1) |
| MerkleProofCircuit | 🔶 框架 | 100% (1/1) |
| VotingCircuit | 🔶 框架 | 100% (1/1) |
| CircuitAdapter | ✅ 完整 | 100% (3/3) |

**总计**: 13/14 测试通过 (92.9%)

---

## 运行测试

```bash
# 测试所有电路
cd rust-prover
cargo test

# 测试特定电路
cargo test square
cargo test range_proof
cargo test balance_proof
cargo test merkle_proof
cargo test voting
cargo test adapters

# 运行生产级电路测试
cargo test square
cargo test range_proof
```

---

## 开发路线图

### Phase 1: 基础框架 (已完成 ✅)
- [x] 创建电路模块结构
- [x] 实现 SquareCircuit (生产级)
- [x] 实现 RangeProofCircuit (生产级)
- [x] 创建其他电路的基础框架
- [x] 实现统一的 CircuitAdapter

### Phase 2: 核心功能 (进行中 🚧)
- [ ] 实现 Poseidon 哈希
- [ ] 完善 AgeVerificationCircuit
- [ ] 完善 BalanceProofCircuit
- [ ] 添加承诺方案

### Phase 3: 高级功能 (计划中 📋)
- [ ] 完善 MerkleProofCircuit
- [ ] 完善 VotingCircuit
- [ ] 添加批量证明支持
- [ ] 性能优化

---

## 与 Circom 的主要差异

### 1. 哈希函数
- **Circom**: 使用 Poseidon (circomlib)
- **Halo2**: 需要自行实现 Poseidon 或使用其他哈希

### 2. 约束系统
- **Circom**: R1CS (Rank-1 Constraint System)
- **Halo2**: PLONK-style gates

### 3. 证明系统
- **Circom**: Groth16 / PLONK
- **Halo2**: PLONK with Pasta curves

### 4. 开发体验
- **Circom**: DSL，类似硬件描述语言
- **Halo2**: Rust，更灵活但学习曲线更陡

---

## 贡献指南

欢迎贡献！请遵循以下步骤:

1. **选择一个电路** (优先级: AgeVerification > Balance > Merkle > Voting)
2. **实现约束逻辑** (参考 Circom 实现)
3. **添加测试用例** (至少 3 个: 正常、边界、错误)
4. **更新文档** (本文件 + 代码注释)
5. **提交 PR**

---

## 参考资源

- [Circom 文档](https://docs.circom.io/)
- [Halo2 文档](https://zcash.github.io/halo2/)
- [Poseidon 哈希](https://www.poseidon-hash.info/)
- [ZKP 项目主文档](../README.md)

---

**维护者**: ZKP Project Team  
**最后更新**: 2025-11-08
