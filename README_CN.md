# ZKP Project - 完整零知识证明项目模板

[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://soliditylang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | 简体中文

完整的零知识证明（ZKP）项目模板，集成 Rust、Node.js/TypeScript、Circom 和 Solidity，支持从电路设计到链上验证的全流程。

## 🎯 项目概述

本项目提供了一个生产级的 ZKP 开发框架，包含：

- **Rust Prover**：基于 Halo2 的证明生成器，支持 WASM 编译
- **Circom 电路**：使用 Circom 2.0 编写的示例电路
- **Node.js SDK**：TypeScript SDK，提供证明生成和验证接口
- **智能合约**：Solidity Groth16 Verifier 合约
- **Backend API**：Express.js RESTful API 服务

## 📁 项目结构

```
zkp-project/
├─ rust-prover/              # Rust 证明生成器（Halo2）
│  ├─ src/
│  │  ├─ lib.rs              # WASM 接口和核心逻辑
│  │  └─ circuit.rs          # 电路定义（x² = y）
│  ├─ test/
│  │  ├─ test-wasm.js        # 完整测试套件（15个测试）
│  │  ├─ test-simple.js      # 简单调试测试
│  │  └─ README.md           # 测试文档
│  ├─ README.md              # 模块文档
│  ├─ CHANGELOG.md           # 更新日志
│  └─ Cargo.toml
│
├─ circom-circuits/          # Circom 电路
│  ├─ circuits/
│  │  └─ example.circom      # 乘法验证电路
│  ├─ scripts/
│  │  ├─ build_circuit.sh    # 电路编译脚本
│  │  └─ test_circuit.js     # 电路测试
│  └─ package.json
│
├─ node-sdk/                 # Node.js/TypeScript SDK
│  ├─ src/
│  │  ├─ proverClient.ts     # 证明生成客户端
│  │  ├─ verifierClient.ts   # 验证客户端
│  │  └─ contractClient.ts   # 合约交互客户端
│  ├─ scripts/
│  │  ├─ generateProof.ts    # 生成证明脚本
│  │  └─ verifyProof.ts      # 验证证明脚本
│  └─ package.json
│
├─ smart-contracts/          # Solidity 智能合约
│  ├─ contracts/
│  │  ├─ Verifier.sol        # Groth16 Verifier
│  │  └─ ZKPApplication.sol  # 应用合约示例
│  ├─ scripts/
│  │  ├─ deploy.js           # 部署脚本
│  │  └─ verify-on-chain.js  # 链上验证脚本
│  └─ hardhat.config.js
│
├─ backend/                  # 后端 API 服务（可选）
│  ├─ src/
│  │  └─ server.ts           # Express.js 服务器
│  └─ package.json
│
└─ README.md
```

## 🚀 快速开始

### 前置要求

- **Rust** >= 1.70
- **Node.js** >= 18
- **npm** 或 **yarn**
- **Circom** 2.0+
- **wasm-pack**（用于 Rust WASM 编译）

### 1. 安装依赖

```bash
# 安装 Circom
npm install -g circom

# 安装 wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# 安装项目依赖
cd circom-circuits && npm install
cd ../node-sdk && npm install
cd ../smart-contracts && npm install
cd ../backend && npm install
```

### 2. 构建 Circom 电路

```bash
cd circom-circuits
npm run build
```

这将：
- 编译电路为 R1CS 和 WASM
- 生成 zkey（proving key）
- 导出验证密钥和 Solidity verifier

### 3. 生成证明

```bash
cd node-sdk
npm run generate-proof
```

输出：
- `circom-circuits/build/generated_proof.json`
- `circom-circuits/build/generated_calldata.txt`

### 4. 验证证明（链下）

```bash
cd node-sdk
npm run verify-proof
```

### 5. 部署智能合约

启动本地 Hardhat 节点：
```bash
cd smart-contracts
npx hardhat node
```

在新终端部署合约：
```bash
cd smart-contracts
npm run deploy:localhost
```

### 6. 链上验证

```bash
cd smart-contracts
node scripts/verify-on-chain.js
```

### 7. 启动后端服务（可选）

```bash
cd backend
npm run dev
```

API 端点：
- `POST /api/proof/generate` - 生成证明
- `POST /api/proof/verify` - 验证证明
- `POST /api/proof/export-calldata` - 导出 Solidity calldata
- `GET /api/circuit/info` - 获取电路信息

## 📖 详细使用指南

### Rust Prover（Halo2）

```bash
cd rust-prover

# 构建 WASM
wasm-pack build --target web

# 运行测试
node test/test-wasm.js

# 快速测试
node test/test-simple.js
```

### Circom 电路

电路示例（`circuits/example.circom`）：
```circom
template Multiplier() {
    signal input a;
    signal input b;
    signal output c;
    c <== a * b;
}
```

测试电路：
```bash
cd circom-circuits
npm run test
```

### Node.js SDK

```typescript
import { ProverClient, VerifierClient } from 'zkp-node-sdk';

// 生成证明
const prover = new ProverClient('example', './build');
const proof = await prover.generateProof({ a: 3, b: 11 });

// 验证证明
const verifier = new VerifierClient('./build/verification_key.json');
const result = await verifier.verify(proof);
console.log('Verified:', result.verified);
```

### 智能合约交互

```typescript
import { ContractClient } from 'zkp-node-sdk';

const client = new ContractClient(
    'http://localhost:8545',
    process.env.PRIVATE_KEY
);

await client.connect(verifierAddress, './abi.json');
const verified = await client.verifyProofOnChain(proofData);
```

## 🔧 配置

### 环境变量

复制示例配置文件：
```bash
cp node-sdk/.env.example node-sdk/.env
cp smart-contracts/.env.example smart-contracts/.env
cp backend/.env.example backend/.env
```

编辑配置：
- `RPC_URL`: 区块链 RPC 端点
- `PRIVATE_KEY`: 部署者私钥
- `PORT`: 后端服务端口

## 📊 工作流程

1. **设计电路** → Circom/Halo2 电路定义
2. **编译电路** → 生成 WASM、R1CS、zkey
3. **生成证明** → 使用私有输入生成 ZK proof
4. **链下验证** → 快速验证（无需区块链）
5. **链上验证** → 通过智能合约验证
6. **应用集成** → 使用 SDK 或 API 集成到应用

## 🧪 测试

```bash
# Rust WASM 测试
cd rust-prover && node test/test-wasm.js

# Circom 电路测试
cd circom-circuits && npm run test

# Node SDK 测试
cd node-sdk && npm test

# 智能合约测试
cd smart-contracts && npx hardhat test
```

## 📈 性能优化

- **电路优化**：减少约束数量
- **并行化**：使用多线程证明生成
- **批量验证**：聚合多个证明
- **Gas 优化**：优化 Solidity verifier

## 🔐 安全注意事项

⚠️ **重要**：
- 不要在生产环境使用示例私钥
- 妥善保管 proving key 和 verification key
- 审计电路逻辑避免漏洞
- 使用可信设置（Trusted Setup）进行生产部署

## 🤝 贡献

欢迎贡献！请遵循以下步骤：
1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 📖 相关文档

- [完整文档](README.md) | [简体中文](README_CN.md)
- [快速开始](QUICKSTART.md) | [Quick Start](QUICKSTART_CN.md)
- [项目结构](STRUCTURE.md) | [Project Structure](STRUCTURE_CN.md)
- [命令参考](COMMANDS.md) | [Command Reference](COMMANDS_CN.md)
- [项目总结](PROJECT_SUMMARY.md) | [Project Summary](PROJECT_SUMMARY_CN.md)
- [验证分析](VALIDATION_ANALYSIS.md) | [Validation Analysis](VALIDATION_ANALYSIS_CN.md)
- [Circom 官方文档](https://docs.circom.io/)
- [snarkjs 指南](https://github.com/iden3/snarkjs)
- [Halo2 教程](https://zcash.github.io/halo2/)

## 🙏 致谢

- [Halo2](https://github.com/zcash/halo2) - Zcash 团队
- [Circom](https://github.com/iden3/circom) - iden3 团队
- [snarkjs](https://github.com/iden3/snarkjs) - iden3 团队
- [Hardhat](https://hardhat.org/) - Nomic Foundation

## 📞 联系方式

- Issues: [GitHub Issues](https://github.com/yourusername/zkp-project/issues)
- Discord: [Join our community](#)

---

**Happy ZK proving! 🎉**
