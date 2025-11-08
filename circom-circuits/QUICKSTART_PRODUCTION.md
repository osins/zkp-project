# 🚀 生产级 ZKP 电路快速启动指南

## 📋 概述

本指南将帮助你快速上手使用生产级 ZKP 电路。

**总计:** 5 个生产级电路  
**状态:** ✅ 开发完成，待审查  
**预计时间:** 15-30 分钟

---

## 📦 1. 环境准备

### 1.1 系统要求
- Node.js >= 14.0
- Circom >= 2.0.0
- 8GB+ RAM（推荐）

### 1.2 安装依赖

```bash
# 进入项目目录
cd circom-circuits

# 安装 Node.js 依赖
npm install

# 验证 circom 安装
circom --version
```

### 1.3 安装 Circom（如果未安装）

```bash
# macOS/Linux
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom
```

---

## 🔨 2. 构建电路

### 2.1 构建所有生产级电路

```bash
# 运行构建脚本
./scripts/build_production.sh
```

**预期输出:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 构建电路: range_proof
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️  编译中...
✅ 编译成功
✅ WASM 文件生成成功 (大小: 50K)

[... 其他电路 ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 构建总结
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
总电路数: 5
成功: 5
失败: 0
🎉 所有电路构建成功！
```

### 2.2 构建单个电路（可选）

```bash
# 构建 MerkleProof 电路
circom circuits/production/merkle_proof.circom \
    --r1cs --wasm --sym \
    --output build/production/merkle_proof
```

---

## 🧪 3. 运行测试

### 3.1 运行所有测试

```bash
# 运行测试脚本
./scripts/test_production.sh
```

### 3.2 运行单个电路测试

```bash
# 测试 MerkleProof
npm test tests/test_merkle_proof.js

# 测试 AgeVerification
npm test tests/test_age_verification.js

# 测试 BalanceProof
npm test tests/test_balance_proof.js

# 测试 VotingCircuit
npm test tests/test_voting_circuit.js
```

**预期输出:**
```
  MerkleProof Circuit - 生产级测试
    ✅ 正常情况测试
      ✓ 应该验证有效的默克尔路径 (4个叶子) (125ms)
      ✓ 应该验证有效的默克尔路径 (8个叶子) (135ms)
    🔬 边界情况测试
      ✓ 应该处理单个叶子 (50ms)
    ❌ 无效输入测试
      ✓ 应该拒绝错误的根 (45ms)
    📊 性能测试
      ✓ 应该在合理时间内生成证明 (350ms)
      
  15 passing (2s)
```

---

## 💡 4. 使用示例

### 4.1 MerkleProof - 默克尔树证明

**场景:** 证明你在白名单中，但不泄露你是谁

```javascript
const { buildPoseidon } = require("circomlibjs");
const snarkjs = require("snarkjs");

// 1. 准备数据
const poseidon = await buildPoseidon();

// 你的叶子节点
const myLeaf = "123456";

// 白名单（默克尔树叶子）
const leaves = ["123456", "789012", "345678", "901234"];

// 2. 构建默克尔树并获取路径
function hash(left, right) {
    const h = poseidon([BigInt(left), BigInt(right)]);
    return poseidon.F.toString(h);
}

// 计算根和路径（简化版本）
const level1 = [
    hash(leaves[0], leaves[1]),
    hash(leaves[2], leaves[3])
];
const root = hash(level1[0], level1[1]);

// 我的路径（叶子索引 0）
const pathElements = [leaves[1], level1[1]];
const pathIndices = [0, 0];

// 3. 生成证明
const input = {
    leaf: myLeaf,
    root: root,
    pathElements: pathElements.concat(new Array(18).fill("0")),
    pathIndices: pathIndices.concat(new Array(18).fill(0))
};

const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    "build/production/merkle_proof/merkle_proof_js/merkle_proof.wasm",
    "merkle_proof_0001.zkey"
);

// 4. 验证证明
const vKey = JSON.parse(fs.readFileSync("verification_key.json"));
const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);

console.log("Proof verified:", verified);  // true
console.log("Your identity is hidden!");   // 身份已隐藏
```

### 4.2 AgeVerification - 年龄验证

**场景:** 证明你满 18 岁，但不泄露具体年龄

```javascript
// 1. 生成年龄承诺
const age = 25;
const salt = crypto.randomBytes(32).toString('hex');

function computeCommitment(age, salt) {
    const h = poseidon([BigInt(age), BigInt(salt)]);
    return poseidon.F.toString(h);
}

const commitment = computeCommitment(age, salt);

// 2. 生成证明
const input = {
    age: 25,
    salt: salt,
    ageCommitment: commitment,
    minAge: 18,
    maxAge: 100
};

const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    "build/production/age_verification/age_verification_js/age_verification.wasm",
    "age_verification_0001.zkey"
);

// 3. 验证
// publicSignals[0] = commitment
// publicSignals[1] = minAge (18)
// publicSignals[2] = maxAge (100)
// publicSignals[3] = valid (1 表示通过)

console.log("Age verified:", publicSignals[3] === "1");
console.log("Actual age hidden!");
```

### 4.3 BalanceProof - 余额证明

**场景:** 证明余额 >= 1000 USDT，但不泄露具体金额

```javascript
// 1. 生成余额承诺
const balance = 5000;
const accountId = 12345;
const salt = crypto.randomBytes(32).toString('hex');

function computeBalanceCommitment(balance, accountId, salt) {
    const h = poseidon([
        BigInt(balance),
        BigInt(accountId),
        BigInt(salt)
    ]);
    return poseidon.F.toString(h);
}

const commitment = computeBalanceCommitment(balance, accountId, salt);

// 2. 生成证明
const input = {
    balance: 5000,
    accountId: 12345,
    salt: salt,
    balanceCommitment: commitment,
    requiredAmount: 1000
};

const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    "build/production/balance_proof/balance_proof_js/balance_proof.wasm",
    "balance_proof_0001.zkey"
);

// publicSignals[0] = commitment
// publicSignals[1] = requiredAmount (1000)
// publicSignals[2] = sufficient (1 表示充足)

console.log("Balance sufficient:", publicSignals[2] === "1");
console.log("Actual balance hidden!");
```

### 4.4 VotingCircuit - 匿名投票

**场景:** DAO 治理投票，隐藏投票者身份

```javascript
// 1. 注册阶段 - 生成投票者承诺
const voterSecret = crypto.randomBytes(32).toString('hex');

function generateCommitment(secret) {
    const h = poseidon([BigInt(secret)]);
    return poseidon.F.toString(h);
}

const commitment = generateCommitment(voterSecret);
// 将 commitment 加入默克尔树...

// 2. 投票阶段 - 生成投票证明
const input = {
    voterSecret: voterSecret,
    vote: 1,  // 赞成票
    merkleRoot: root,
    pathElements: [...],  // 从默克尔树获取
    pathIndices: [...]
};

const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    "build/production/voting_circuit/voting_circuit_js/voting_circuit.wasm",
    "voting_circuit_0001.zkey"
);

// publicSignals[0] = voterCommitment
// publicSignals[1] = nullifier（防止双重投票）
// publicSignals[2] = voteHash（加密的投票）

// 3. 提交到智能合约
await votingContract.castVote(
    proof,
    publicSignals[1],  // nullifier
    publicSignals[2]   // voteHash
);

console.log("Vote cast anonymously!");
```

---

## 🔐 5. Trusted Setup（生产部署必需）

### 5.1 下载 Powers of Tau

```bash
# 下载预计算的 Powers of Tau（推荐）
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau

# 或使用其他可信的 Powers of Tau
```

### 5.2 生成 zkey

```bash
# 为 MerkleProof 生成 zkey
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
```

### 5.3 生成 Solidity Verifier

```bash
# 生成验证合约
snarkjs zkey export solidityverifier \
    merkle_proof_0001.zkey \
    MerkleProofVerifier.sol
```

---

## 📊 6. 性能基准测试

运行性能测试：

```bash
# 运行包含性能测试的完整测试套件
npm test
```

**预期性能:**

| 电路 | 证明时间 | 验证时间 | Gas 消耗 |
|------|----------|----------|----------|
| RangeProof | ~100ms | ~10ms | ~250K |
| MerkleProof | ~300ms | ~15ms | ~280K |
| AgeVerification | ~150ms | ~12ms | ~260K |
| BalanceProof | ~180ms | ~13ms | ~270K |
| VotingCircuit | ~350ms | ~16ms | ~300K |

---

## 🔍 7. 验证部署

### 7.1 检查构建产物

```bash
ls -la build/production/merkle_proof/
# 应该看到:
# - merkle_proof.r1cs
# - merkle_proof.sym
# - merkle_proof_js/merkle_proof.wasm
```

### 7.2 验证约束数量

```bash
snarkjs r1cs info build/production/merkle_proof/merkle_proof.r1cs
```

### 7.3 查看构建报告

```bash
cat build/production/build_report.txt
```

---

## 📚 8. 进一步学习

### 文档资源
- **完整文档:** `docs/PRODUCTION_CIRCUITS.md`
- **电路规范:** `docs/CIRCUIT_SPECIFICATION.md`
- **审查清单:** `docs/REVIEW_CHECKLIST.md`
- **部署报告:** `PRODUCTION_DEPLOYMENT_REPORT.md`

### 示例代码
- **示例电路:** `circuits/examples/`
- **测试用例:** `tests/`

### 社区资源
- [Circom 官方文档](https://docs.circom.io/)
- [SnarkJS 文档](https://github.com/iden3/snarkjs)
- [circomlib 标准库](https://github.com/iden3/circomlib)

---

## ❓ 常见问题

### Q1: 编译失败怎么办？
**A:** 检查 circom 版本（需要 >= 2.0.0），确保语法正确。

### Q2: 测试超时怎么办？
**A:** 大型电路需要更多时间，可以增加超时设置。

### Q3: 如何优化 Gas 消耗？
**A:** 减少公开输入数量，使用批量验证。

### Q4: 可以在生产环境使用吗？
**A:** 需要完成安全审查和 Trusted Setup 后才能用于生产。

---

## 🎉 下一步

1. ✅ 熟悉每个电路的功能
2. ✅ 运行所有测试确认工作正常
3. ✅ 尝试修改参数看效果
4. 🔲 进行代码审查
5. 🔲 完成 Trusted Setup
6. 🔲 部署到测试网
7. 🔲 主网部署

---

**祝你使用愉快！** 🚀

如有问题，请查阅完整文档或联系开发团队。
