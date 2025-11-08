# 项目完整结构

```
zkp-project/
│
├── 📄 README.md                      # 项目主文档
├── 📄 LICENSE                        # MIT 许可证
├── 📄 package.json                   # 根目录 package.json（workspace）
├── 📄 .gitignore                     # Git 忽略配置
├── 📄 STRUCTURE.md                   # 本文件（项目结构）
│
├── 📁 rust-prover/                   # Rust 证明生成器（Halo2）
│   ├── 📄 Cargo.toml                 # Rust 依赖配置
│   ├── 📄 build_wasm.sh              # WASM 构建脚本
│   ├── 📄 README.md                  # 模块文档
│   ├── 📄 CHANGELOG.md               # 更新日志
│   ├── 📄 .gitignore
│   │
│   ├── 📁 src/
│   │   ├── 📄 lib.rs                 # WASM 接口和核心逻辑
│   │   └── 📄 circuit.rs             # Halo2 电路定义（x² = y）
│   │
│   ├── 📁 test/
│   │   ├── 📄 test-wasm.js           # 完整测试套件（15个测试）
│   │   ├── 📄 test-simple.js         # 简单调试测试
│   │   ├── 📄 README.md              # 测试文档
│   │   ├── 📄 WASM_TEST_SUCCESS.md   # 测试报告
│   │   └── 📄 test-results.txt       # 测试结果
│   │
│   └── 📁 pkg/                       # WASM 输出（wasm-pack 生成）
│       ├── 📄 rust_prover.js
│       ├── 📄 rust_prover_bg.wasm
│       └── 📄 rust_prover.d.ts
│
├── 📁 circom-circuits/               # Circom 电路
│   ├── 📄 package.json               # Node 依赖
│   ├── 📄 .gitignore
│   │
│   ├── 📁 circuits/
│   │   └── 📄 example.circom         # Circom 电路（乘法验证）
│   │
│   ├── 📁 scripts/
│   │   ├── 📄 build_circuit.sh       # 电路编译脚本
│   │   └── 📄 test_circuit.js        # 电路测试脚本
│   │
│   └── 📁 build/                     # 构建输出（gitignore）
│       ├── 📄 example.r1cs           # R1CS 约束文件
│       ├── 📄 example_final.zkey     # Proving key
│       ├── 📄 verification_key.json  # Verification key
│       ├── 📄 Verifier.sol           # 生成的 Solidity verifier
│       ├── 📄 proof.json             # 示例证明
│       └── 📄 calldata.txt           # Solidity calldata
│
├── 📁 node-sdk/                      # Node.js/TypeScript SDK
│   ├── 📄 package.json
│   ├── 📄 tsconfig.json
│   ├── 📄 .env.example
│   ├── 📄 .gitignore
│   │
│   ├── 📁 src/
│   │   ├── 📄 index.ts               # SDK 主入口
│   │   ├── 📄 proverClient.ts        # 证明生成客户端
│   │   ├── 📄 verifierClient.ts      # 验证客户端
│   │   └── 📄 contractClient.ts      # 智能合约交互客户端
│   │
│   ├── 📁 scripts/
│   │   ├── 📄 generateProof.ts       # 生成证明脚本
│   │   └── 📄 verifyProof.ts         # 验证证明脚本
│   │
│   └── 📁 dist/                      # TypeScript 编译输出
│
├── 📁 smart-contracts/               # Solidity 智能合约
│   ├── 📄 package.json
│   ├── 📄 hardhat.config.js          # Hardhat 配置
│   ├── 📄 .env.example
│   ├── 📄 .gitignore
│   │
│   ├── 📁 contracts/
│   │   ├── 📄 Verifier.sol           # Groth16 Verifier 合约
│   │   └── 📄 ZKPApplication.sol     # ZKP 应用示例合约
│   │
│   ├── 📁 scripts/
│   │   ├── 📄 deploy.js              # 合约部署脚本
│   │   └── 📄 verify-on-chain.js     # 链上验证脚本
│   │
│   ├── 📁 test/
│   │   └── 📄 Verifier.test.js       # 合约测试
│   │
│   ├── 📁 artifacts/                 # Hardhat 编译输出
│   └── 📁 cache/                     # Hardhat 缓存
│
├── 📁 backend/                       # 后端 API 服务（可选）
│   ├── 📄 package.json
│   ├── 📄 tsconfig.json
│   ├── 📄 .env.example
│   ├── 📄 .gitignore
│   │
│   ├── 📁 src/
│   │   └── 📄 server.ts              # Express.js API 服务器
│   │
│   └── 📁 dist/                      # TypeScript 编译输出
│
└── 📁 scripts/                       # 全局脚本
    ├── 📄 setup.sh                   # 项目初始化脚本
    ├── 📄 build-all.sh               # 构建所有模块
    ├── 📄 test-all.sh                # 运行所有测试
    ├── 📄 demo.sh                    # 演示脚本
    └── 📄 clean.sh                   # 清理构建文件
```

## 📊 文件统计

| 模块 | 文件数 | 主要语言 |
|------|--------|----------|
| rust-prover | 14 | Rust |
| circom-circuits | 6 | Circom, JavaScript |
| node-sdk | 10 | TypeScript |
| smart-contracts | 11 | Solidity, JavaScript |
| backend | 5 | TypeScript |
| scripts | 6 | Bash |
| **总计** | **52+** | 多语言 |

## 🔑 关键文件说明

### Rust Prover
- `lib.rs`: WASM 接口导出和核心证明/验证逻辑
- `circuit.rs`: Halo2 电路定义，实现 x² = y 验证
- `test/test-wasm.js`: 完整的测试套件（15个测试用例）
- `test/test-simple.js`: 简单调试测试

### Circom Circuits
- `example.circom`: Circom 电路，乘法验证（a × b = c）
- `build_circuit.sh`: 完整编译流程（R1CS → zkey → Verifier.sol）
- `test_circuit.js`: 电路测试与证明生成

### Node SDK
- `proverClient.ts`: 封装 snarkjs 证明生成
- `verifierClient.ts`: 链下验证接口
- `contractClient.ts`: ethers.js 链上交互

### Smart Contracts
- `Verifier.sol`: Groth16 验证器（snarkjs 生成）
- `ZKPApplication.sol`: 应用示例（积分奖励系统）
- `deploy.js`: Hardhat 部署脚本

### Backend
- `server.ts`: RESTful API 服务
  - `POST /api/proof/generate`
  - `POST /api/proof/verify`
  - `POST /api/proof/export-calldata`

## 🔄 工作流程

```
1. 设计电路
   ↓
2. 编译电路 (build_circuit.sh)
   → 生成 R1CS, WASM, zkey, Verifier.sol
   ↓
3. 生成证明 (generateProof.ts)
   → 使用 snarkjs + circuit
   ↓
4. 链下验证 (verifyProof.ts)
   → 快速验证（无需区块链）
   ↓
5. 部署合约 (deploy.js)
   → Hardhat 部署到链上
   ↓
6. 链上验证 (verify-on-chain.js)
   → 通过智能合约验证
```

## 📦 依赖关系

```
node-sdk ─┬─→ circom-circuits (build outputs)
          └─→ smart-contracts (ABI)

smart-contracts ──→ circom-circuits (Verifier.sol)

backend ──→ circom-circuits (build outputs)

rust-prover (独立模块)
```
