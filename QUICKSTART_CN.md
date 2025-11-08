# 🚀 快速启动指南

5 分钟快速体验完整的 ZKP 工作流程！

## ⚡ 一键安装与运行

```bash
# 1. 克隆项目（如果需要）
# git clone <your-repo-url>
cd zkp-project

# 2. 自动安装所有依赖
bash scripts/setup.sh

# 3. 运行完整演示
bash scripts/demo.sh
```

## 📝 分步指南

### 步骤 1：构建 Circom 电路

```bash
cd circom-circuits
npm run build
```

**输出文件：**
- ✅ `build/example.r1cs` - 电路约束
- ✅ `build/example_final.zkey` - Proving key
- ✅ `build/verification_key.json` - Verification key
- ✅ `build/Verifier.sol` - Solidity verifier

**预计时间：** 2-5 分钟（首次需下载 Powers of Tau）

---

### 步骤 2：生成零知识证明

```bash
cd node-sdk
npm run generate-proof
```

**示例输出：**
```
🔐 Generating zero-knowledge proof...
📥 Input: { a: 3, b: 11 }
   Expected: c = 33

✅ Proof generated successfully
📊 Public signals: [ '33' ]
💾 Proof saved to ../../circom-circuits/build/generated_proof.json
```

**生成的文件：**
- `build/generated_proof.json`
- `build/generated_calldata.txt`

---

### 步骤 3：链下验证

```bash
npm run verify-proof
```

**示例输出：**
```
🔍 Verifying proof off-chain...

🔑 Verification Key Info:
   Protocol: groth16
   Curve: bn128
   Public inputs: 1

✅ Proof verified successfully!

📊 Verification Result:
   Status: ✅ VALID
   Public signals: 33
```

---

### 步骤 4：部署智能合约

**启动本地 Hardhat 节点（终端 1）：**
```bash
cd smart-contracts
npx hardhat node
```

**部署合约（终端 2）：**
```bash
cd smart-contracts
npm run deploy:localhost
```

**示例输出：**
```
🚀 Deploying ZKP Contracts...

1️⃣  Deploying Groth16Verifier...
✅ Groth16Verifier deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

2️⃣  Deploying ZKPApplication...
✅ ZKPApplication deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

📊 Deployment Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Network:          localhost
Verifier:         0x5FbDB...
ZKP Application:  0xe7f17...
```

---

### 步骤 5：链上验证

```bash
node scripts/verify-on-chain.js
```

**示例输出：**
```
🔗 On-chain Proof Verification Script

📍 ZKP Application: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

📤 Submitting proof to blockchain...
⏳ Transaction sent: 0x1234...
✅ Transaction confirmed in block: 2

📡 Events emitted:
   ProofVerified: [ '0x742d...', '0xabcd...', 33n ]
   PointsAwarded: [ '0x742d...', 100n ]

🎯 User points: 100

✅ On-chain verification successful!
```

---

## 🎯 完整工作流总结

| 步骤 | 命令 | 输出 | 时间 |
|------|------|------|------|
| 1. 构建电路 | `npm run build` | zkey, vkey, Verifier.sol | 2-5 min |
| 2. 生成证明 | `npm run generate-proof` | proof.json | 5-10 sec |
| 3. 链下验证 | `npm run verify-proof` | ✅/❌ | <1 sec |
| 4. 部署合约 | `npm run deploy:localhost` | Contract address | 5-10 sec |
| 5. 链上验证 | `node verify-on-chain.js` | Transaction receipt | 2-5 sec |

---

## 🧪 测试命令

```bash
# 测试 Rust WASM prover
cd rust-prover
node test/test-wasm.js      # 完整测试（15个测试）
node test/test-simple.js    # 快速测试

# 测试 Circom 电路
cd circom-circuits && npm run test

# 测试智能合约
cd smart-contracts && npx hardhat test

# 运行所有测试
npm run test:all
```

---

## 🔧 故障排除

### ❌ "Circuit files not found"
**解决方案：**
```bash
cd circom-circuits
npm run build
```

### ❌ "Verifier contract not deployed"
**解决方案：**
1. 确保 Hardhat 节点运行中
2. 重新部署合约：
```bash
cd smart-contracts
npm run deploy:localhost
```

### ❌ "Powers of Tau download failed"
**解决方案：**
手动下载：
```bash
cd circom-circuits/build
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau
```

### ❌ Rust 编译错误
**解决方案：**
```bash
# 确保 wasm-pack 已安装
cargo install wasm-pack

# 清理并重新构建
cd rust-prover
cargo clean
wasm-pack build --target nodejs
```

---

## 📚 进阶使用

### 自定义电路输入

编辑 `node-sdk/scripts/generateProof.ts`：

```typescript
const input = {
    a: 7,    // 修改这里
    b: 9     // 修改这里
};
// 预期输出：c = 63
```

### 部署到测试网

1. 编辑 `smart-contracts/.env`：
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=0x...
```

2. 部署：
```bash
npm run deploy:sepolia
```

### 启动 Backend API

```bash
cd backend
npm run dev

# API 端点：
# POST http://localhost:3000/api/proof/generate
# POST http://localhost:3000/api/proof/verify
```

**示例 API 调用：**
```bash
curl -X POST http://localhost:3000/api/proof/generate \
  -H "Content-Type: application/json" \
  -d '{"input": {"a": 3, "b": 11}}'
```

### 测试 Rust WASM

```bash
cd rust-prover
wasm-pack build --target nodejs
node test/test-wasm.js
```

---

## 🎓 学习路径

1. **初学者**：运行 `bash scripts/demo.sh`，理解完整流程
2. **中级**：修改 `example.circom`，实现自定义逻辑
3. **高级**：集成 Halo2 Rust prover，优化性能

---

## 📖 相关文档

- [完整文档](README.md)
- [项目结构](STRUCTURE.md)
- [Circom 官方文档](https://docs.circom.io/)
- [snarkjs 指南](https://github.com/iden3/snarkjs)
- [Halo2 教程](https://zcash.github.io/halo2/)

---

## 🆘 获取帮助

- GitHub Issues: [提交问题](#)
- Discord: [加入社区](#)
- Email: support@zkp-project.io

---

**Happy ZK proving! 🎉**
