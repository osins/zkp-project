# ZKP Project - Complete Zero-Knowledge Proof Project Template

[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://soliditylang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

English | [简体中文](README_CN.md)

A complete Zero-Knowledge Proof (ZKP) project template integrating Rust, Node.js/TypeScript, Circom, and Solidity, supporting the full workflow from circuit design to on-chain verification.

## 🎯 项目概述

本项目提供了一个生产级的 ZKP 开发框架，包含：

- **Rust Prover**：基于 Halo2 的证明生成器，支持 WASM 编译
- **Circom 电路**：使用 Circom 2.0 编写的示例电路
- **Node.js SDK**：TypeScript SDK，提供证明生成和验证接口
- **智能合约**：Solidity Groth16 Verifier 合约
- **Backend API**：Express.js RESTful API 服务

## 📁 Project Structure

```
zkp-project/
├─ rust-prover/              # Rust Proof Generator (Halo2)
│  ├─ src/
│  │  ├─ lib.rs              # WASM interface and core logic
│  │  └─ circuit.rs          # Circuit definition (x² = y)
│  ├─ test/
│  │  ├─ test-wasm.js        # Complete test suite (15 tests)
│  │  ├─ test-simple.js      # Simple debugging tests
│  │  └─ README.md           # Test documentation
│  ├─ README.md              # Module documentation
│  ├─ CHANGELOG.md           # Changelog
│  └─ Cargo.toml
│
├─ circom-circuits/          # Circom Circuits
│  ├─ circuits/
│  │  └─ example.circom      # Multiplication verification circuit
│  ├─ scripts/
│  │  ├─ build_circuit.sh    # Circuit compilation script
│  │  └─ test_circuit.js     # Circuit testing
│  └─ package.json
│
├─ node-sdk/                 # Node.js/TypeScript SDK
│  ├─ src/
│  │  ├─ proverClient.ts     # Proof generation client
│  │  ├─ verifierClient.ts   # Verification client
│  │  └─ contractClient.ts   # Contract interaction client
│  ├─ scripts/
│  │  ├─ generateProof.ts    # Proof generation script
│  │  └─ verifyProof.ts      # Proof verification script
│  └─ package.json
│
├─ smart-contracts/          # Solidity Smart Contracts
│  ├─ contracts/
│  │  ├─ Verifier.sol        # Groth16 Verifier
│  │  └─ ZKPApplication.sol  # Application contract example
│  ├─ scripts/
│  │  ├─ deploy.js           # Deployment script
│  │  └─ verify-on-chain.js  # On-chain verification script
│  └─ hardhat.config.js
│
├─ backend/                  # Backend API Service (Optional)
│  ├─ src/
│  │  └─ server.ts           # Express.js server
│  └─ package.json
│
└─ README.md
```

## 🚀 Quick Start

### Prerequisites

- **Rust** >= 1.70
- **Node.js** >= 18
- **npm** or **yarn**
- **Circom** 2.0+
- **wasm-pack** (for Rust WASM compilation)

### 1. Install Dependencies

```bash
# Install Circom
npm install -g circom

# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Install project dependencies
cd circom-circuits && npm install
cd ../node-sdk && npm install
cd ../smart-contracts && npm install
cd ../backend && npm install
```

### 2. Build Circom Circuits

```bash
cd circom-circuits
npm run build
```

This will:
- Compile circuits to R1CS and WASM
- Generate zkey (proving key)
- Export verification key and Solidity verifier

### 3. Generate Proof

```bash
cd node-sdk
npm run generate-proof
```

Output:
- `circom-circuits/build/generated_proof.json`
- `circom-circuits/build/generated_calldata.txt`

### 4. Verify Proof (Off-chain)

```bash
cd node-sdk
npm run verify-proof
```

### 5. Deploy Smart Contracts

Start local Hardhat node:
```bash
cd smart-contracts
npx hardhat node
```

Deploy contracts in a new terminal:
```bash
cd smart-contracts
npm run deploy:localhost
```

### 6. On-chain Verification

```bash
cd smart-contracts
node scripts/verify-on-chain.js
```

### 7. Start Backend Service (Optional)

```bash
cd backend
npm run dev
```

API Endpoints:
- `POST /api/proof/generate` - Generate proof
- `POST /api/proof/verify` - Verify proof
- `POST /api/proof/export-calldata` - Export Solidity calldata
- `GET /api/circuit/info` - Get circuit information

## 📖 Detailed Usage Guide

### Rust Prover (Halo2)

```bash
cd rust-prover

# Build WASM
wasm-pack build --target nodejs

# Run tests
node test/test-wasm.js

# Quick test
node test/test-simple.js
```

### Circom Circuits

Circuit example (`circuits/example.circom`):
```circom
template Multiplier() {
    signal input a;
    signal input b;
    signal output c;
    c <== a * b;
}
```

Test circuits:
```bash
cd circom-circuits
npm run test
```

### Node.js SDK

```typescript
import { ProverClient, VerifierClient } from 'zkp-node-sdk';

// Generate proof
const prover = new ProverClient('example', './build');
const proof = await prover.generateProof({ a: 3, b: 11 });

// Verify proof
const verifier = new VerifierClient('./build/verification_key.json');
const result = await verifier.verify(proof);
console.log('Verified:', result.verified);
```

### Smart Contract Interaction

```typescript
import { ContractClient } from 'zkp-node-sdk';

const client = new ContractClient(
    'http://localhost:8545',
    process.env.PRIVATE_KEY
);

await client.connect(verifierAddress, './abi.json');
const verified = await client.verifyProofOnChain(proofData);
```

## 🔧 Configuration

### Environment Variables

Copy example configuration files:
```bash
cp node-sdk/.env.example node-sdk/.env
cp smart-contracts/.env.example smart-contracts/.env
cp backend/.env.example backend/.env
```

Edit configuration:
- `RPC_URL`: Blockchain RPC endpoint
- `PRIVATE_KEY`: Deployer private key
- `PORT`: Backend service port

## 📊 Workflow

1. **Design Circuit** → Circom/Halo2 circuit definition
2. **Compile Circuit** → Generate WASM, R1CS, zkey
3. **Generate Proof** → Create ZK proof using private inputs
4. **Off-chain Verification** → Quick verification (no blockchain required)
5. **On-chain Verification** → Verify through smart contract
6. **Application Integration** → Integrate using SDK or API

## 🧪 Testing

```bash
# Rust WASM tests
cd rust-prover && node test/test-wasm.js

# Circom circuit tests
cd circom-circuits && npm run test

# Node SDK tests
cd node-sdk && npm test

# Smart contract tests
cd smart-contracts && npx hardhat test
```

## 📈 Performance Optimization

- **Circuit Optimization**: Reduce constraint count
- **Parallelization**: Use multi-threaded proof generation
- **Batch Verification**: Aggregate multiple proofs
- **Gas Optimization**: Optimize Solidity verifier

## 🔐 Security Considerations

⚠️ **Important**:
- Do not use example private keys in production
- Securely store proving keys and verification keys
- Audit circuit logic to avoid vulnerabilities
- Use Trusted Setup for production deployment

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- [Halo2](https://github.com/zcash/halo2) - Zcash team
- [Circom](https://github.com/iden3/circom) - iden3 team
- [snarkjs](https://github.com/iden3/snarkjs) - iden3 team
- [Hardhat](https://hardhat.org/) - Nomic Foundation

## 📞 Contact

- Issues: [GitHub Issues](https://github.com/yourusername/zkp-project/issues)
- Discord: [Join our community](#)

---

**Happy ZK proving! 🎉**
