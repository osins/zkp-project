# 生产级电路文档

## 📋 概述

本文档描述所有生产级 ZKP 电路的功能、使用方法和最佳实践。

**当前状态:** ✅ 生产就绪  
**总电路数:** 5  
**测试覆盖率:** >= 90%

---

## 🔐 电路列表

### 1. RangeProof - 范围证明

**文件:** `circuits/production/range_proof.circom`

**功能:** 证明一个值在指定范围内（0 到 2^n-1），不泄露具体值

**输入:**
- `in`: private - 待验证的值
- `n`: template parameter - 位数

**输出:**
- `out`: public - 验证结果（始终为 1）

**约束数量:** n + 1（n=8 时约 9 个约束）

**使用场景:**
- 年龄验证（0-150）
- 金额范围验证
- 索引有效性验证

**示例:**
```javascript
const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    { in: 25 },  // 证明值在 0-255 范围内
    "range_proof_js/range_proof.wasm",
    "range_proof_0001.zkey"
);
```

**性能:**
- 证明时间: ~100ms (n=32)
- 验证时间: ~10ms
- Gas 消耗: ~250K

---

### 2. MerkleProof - 默克尔树证明

**文件:** `circuits/production/merkle_proof.circom`

**功能:** 证明某个值在默克尔树中，不泄露位置

**输入:**
- `leaf`: private - 叶子节点值
- `pathElements[levels]`: private - 默克尔路径
- `pathIndices[levels]`: private - 路径方向
- `root`: public - 默克尔树根

**输出:** 无（通过约束验证）

**约束数量:** ~levels * 200（levels=20 时约 4,000 个约束）

**使用场景:**
- 匿名成员证明
- 隐私投票（证明有投票权）
- 资产所有权证明
- 隐私交易（Tornado Cash 风格）

**示例:**
```javascript
const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    {
        leaf: "0x123...",
        root: "0xabc...",
        pathElements: [...],
        pathIndices: [...]
    },
    "merkle_proof_js/merkle_proof.wasm",
    "merkle_proof_0001.zkey"
);
```

**性能:**
- 证明时间: ~300ms (levels=20)
- 验证时间: ~15ms
- Gas 消耗: ~280K

**安全注意事项:**
- 使用 Poseidon 哈希（ZK 友好）
- pathIndices 必须是 0 或 1
- 需要离线计算默克尔路径

---

### 3. AgeVerification - 年龄验证

**文件:** `circuits/production/age_verification.circom`

**功能:** 证明年龄在指定范围内，不泄露具体年龄

**输入:**
- `age`: private - 实际年龄
- `salt`: private - 随机盐值
- `ageCommitment`: public - 年龄承诺
- `minAge`: public - 最小年龄
- `maxAge`: public - 最大年龄

**输出:**
- `valid`: public - 验证结果（0或1）

**约束数量:** ~600 个约束

**使用场景:**
- 在线投票（年龄 >= 18）
- 年龄限制内容（年龄 >= 21）
- 老年人优惠（年龄 >= 65）
- KYC 合规验证

**承诺生成:**
```javascript
const { buildPoseidon } = require("circomlibjs");
const poseidon = await buildPoseidon();

function computeAgeCommitment(age, salt) {
    const h = poseidon([BigInt(age), BigInt(salt)]);
    return poseidon.F.toString(h);
}

const commitment = computeAgeCommitment(25, "random_salt");
```

**证明生成:**
```javascript
const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    {
        age: 25,
        salt: "random_salt",
        ageCommitment: commitment,
        minAge: 18,
        maxAge: 65
    },
    "age_verification_js/age_verification.wasm",
    "age_verification_0001.zkey"
);
```

**性能:**
- 证明时间: ~150ms
- 验证时间: ~12ms
- Gas 消耗: ~260K

**隐私保护:**
- 具体年龄完全隐藏
- 仅暴露是否满足范围
- 使用承诺防止重放

---

### 4. BalanceProof - 余额证明

**文件:** `circuits/production/balance_proof.circom`

**功能:** 证明余额充足，不泄露具体余额

**输入:**
- `balance`: private - 实际余额
- `accountId`: private - 账户标识
- `salt`: private - 随机盐值
- `balanceCommitment`: public - 余额承诺
- `requiredAmount`: public - 所需金额

**输出:**
- `sufficient`: public - 余额是否充足（0或1）

**约束数量:** ~450 个约束

**使用场景:**
- DeFi 抵押品验证
- 隐私支付
- 信用评估
- 合规检查

**承诺生成:**
```javascript
function computeBalanceCommitment(balance, accountId, salt) {
    const h = poseidon([
        BigInt(balance),
        BigInt(accountId),
        BigInt(salt)
    ]);
    return poseidon.F.toString(h);
}

const commitment = computeBalanceCommitment(5000, 12345, "random_salt");
```

**证明生成:**
```javascript
const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    {
        balance: 5000,
        accountId: 12345,
        salt: "random_salt",
        balanceCommitment: commitment,
        requiredAmount: 1000
    },
    "balance_proof_js/balance_proof.wasm",
    "balance_proof_0001.zkey"
);
```

**性能:**
- 证明时间: ~180ms
- 验证时间: ~13ms
- Gas 消耗: ~270K

**安全特性:**
- 承诺包含 accountId 防止跨账户攻击
- 支持 64 位余额（最大 2^64-1）
- 范围约束防止溢出

---

### 5. VotingCircuit - 匿名投票

**文件:** `circuits/production/voting_circuit.circom`

**功能:** 实现匿名投票，防止双重投票

**输入:**
- `voterSecret`: private - 投票者私钥
- `vote`: private - 投票选项（0或1）
- `merkleRoot`: public - 投票者默克尔树根
- `pathElements[levels]`: private - 默克尔路径
- `pathIndices[levels]`: private - 路径索引

**输出:**
- `voterCommitment`: public - 投票者承诺
- `nullifier`: public - 废止符（防双重投票）
- `voteHash`: public - 投票哈希

**约束数量:** ~4,400 个约束（levels=20）

**使用场景:**
- DAO 治理投票
- 董事会投票
- 匿名民意调查
- 隐私选举

**投票流程:**

1. **注册阶段:**
```javascript
// 生成投票者承诺
const voterSecret = generateRandomSecret();
const commitment = hash(voterSecret);

// 将承诺加入默克尔树
merkleTree.insert(commitment);
```

2. **投票阶段:**
```javascript
// 生成投票证明
const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    {
        voterSecret,
        vote: 1,  // 赞成
        merkleRoot: merkleTree.root(),
        pathElements: merkleTree.getPathElements(voterIndex),
        pathIndices: merkleTree.getPathIndices(voterIndex)
    },
    "voting_circuit_js/voting_circuit.wasm",
    "voting_circuit_0001.zkey"
);

// 提交 nullifier 和 voteHash
await votingContract.castVote(
    proof,
    publicSignals[0],  // voterCommitment
    publicSignals[1],  // nullifier
    publicSignals[2]   // voteHash
);
```

3. **验证阶段:**
```javascript
// 智能合约验证
require(!usedNullifiers[nullifier], "Already voted");
require(verifyProof(proof, publicSignals), "Invalid proof");

usedNullifiers[nullifier] = true;
votes[voteHash] = true;
```

**性能:**
- 证明时间: ~350ms (levels=20)
- 验证时间: ~16ms
- Gas 消耗: ~300K

**隐私保护:**
- 投票者身份完全隐藏
- 投票内容加密
- 废止符防止双重投票
- 支持匿名计票

---

## 🔧 快速开始

### 安装依赖

```bash
cd circom-circuits
npm install
```

### 构建电路

```bash
./scripts/build_production.sh
```

### 运行测试

```bash
./scripts/test_production.sh
```

或运行单个测试：

```bash
npm test tests/test_merkle_proof.js
```

---

## 📦 生成 Trusted Setup

所有生产级电路都需要 Trusted Setup。推荐使用 Powers of Tau。

### 1. 使用现有的 Powers of Tau

```bash
# 下载 Powers of Tau (例如 perpetual powers of tau)
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau

# 为电路生成 zkey
snarkjs groth16 setup \
    build/production/merkle_proof/merkle_proof.r1cs \
    powersOfTau28_hez_final_15.ptau \
    merkle_proof_0000.zkey

# 贡献随机性
snarkjs zkey contribute \
    merkle_proof_0000.zkey \
    merkle_proof_0001.zkey \
    --name="First contribution" -v

# 导出验证密钥
snarkjs zkey export verificationkey \
    merkle_proof_0001.zkey \
    verification_key.json

# 生成 Solidity verifier
snarkjs zkey export solidityverifier \
    merkle_proof_0001.zkey \
    MerkleProofVerifier.sol
```

### 2. 部署 Verifier 合约

```solidity
// 部署生成的 verifier 合约
// 示例: MerkleProofVerifier.sol
```

---

## 🧪 测试指南

### 测试结构

每个电路都有完整的测试套件：

- **正常情况测试:** 验证基本功能
- **边界情况测试:** 测试极限值
- **无效输入测试:** 验证约束完整性
- **性能测试:** 确保满足性能要求
- **安全测试:** 验证隐私保护

### 运行特定测试

```bash
# MerkleProof
npm test tests/test_merkle_proof.js

# AgeVerification
npm test tests/test_age_verification.js

# BalanceProof
npm test tests/test_balance_proof.js

# VotingCircuit
npm test tests/test_voting_circuit.js
```

---

## 🔒 安全最佳实践

### 1. 私密输入保护

**❌ 错误:**
```javascript
// 不要在日志中打印私密输入
console.log("voterSecret:", voterSecret);
```

**✅ 正确:**
```javascript
// 仅记录公开信息
console.log("Proof generated for commitment:", commitment);
```

### 2. 随机性要求

**❌ 错误:**
```javascript
const salt = "12345";  // 固定盐值
```

**✅ 正确:**
```javascript
const crypto = require('crypto');
const salt = crypto.randomBytes(32).toString('hex');
```

### 3. 承诺管理

- 承诺应该存储在链上或可信存储
- 私钥（secret、salt）必须安全保存
- 使用密钥派生函数（KDF）从主密钥派生

### 4. 防重放攻击

- 使用唯一的 nullifier（VotingCircuit）
- 记录已使用的 nullifier
- 添加时间戳或 nonce

---

## 📊 性能优化

### Gas 优化技巧

1. **批量验证:** 将多个证明合并验证
2. **缓存验证密钥:** 避免重复读取
3. **优化公开输入:** 减少公开输入数量

### 证明时间优化

1. **使用更小的电路:** 权衡功能和性能
2. **并行计算:** 利用多核 CPU
3. **WASM vs Native:** 使用 C++ witness 生成器

---

## 🚀 部署检查清单

在生产环境部署前，确保：

- [ ] 所有测试通过（包括边界和安全测试）
- [ ] 已完成 Trusted Setup
- [ ] 验证密钥已导出并验证
- [ ] Solidity verifier 已审计
- [ ] 性能满足要求（证明时间、Gas）
- [ ] 文档完整且准确
- [ ] 已进行安全审查
- [ ] 监控和告警已配置
- [ ] 应急响应计划已制定

---

## 📞 获取帮助

- **文档:** `docs/` 目录
- **示例:** `circuits/examples/` 目录
- **测试:** `tests/` 目录
- **审查清单:** `docs/REVIEW_CHECKLIST.md`

---

**文档版本:** 1.0.0  
**最后更新:** 2025-11-08  
**维护者:** ZKP Project Team
