# 🎯 命令参考手册

完整的命令列表，按模块分类。

---

## 📦 项目初始化

### 全局命令（根目录）

```bash
# 一键安装所有依赖
bash scripts/setup.sh

# 构建所有模块
npm run build:all
# 或
bash scripts/build-all.sh

# 运行所有测试
npm run test:all

# 清理所有构建文件
npm run clean
# 或
bash scripts/clean.sh

# 运行完整演示
npm run demo
# 或
bash scripts/demo.sh
```

### 分模块构建

```bash
# 构建 Circom 电路
npm run build:circuits

# 构建 Rust prover
npm run build:rust

# 构建 Node SDK
npm run build:sdk

# 编译智能合约
npm run build:contracts
```

---

## 🔧 Rust Prover 命令

```bash
cd rust-prover

# 构建 WASM
wasm-pack build --target web

# 运行测试
node test/test-wasm.js

# 快速测试
node test/test-simple.js

# 清理
cargo clean
rm -rf pkg/
```

---

## ⚡ Circom 电路命令

```bash
cd circom-circuits

# 完整构建流程（编译 + 生成 zkey + 导出 verifier）
npm run build
# 或
bash scripts/build_circuit.sh

# 测试电路
npm run test
# 或
node scripts/test_circuit.js

# 清理构建文件
npm run clean
# 或
rm -rf build/*
```

### 手动步骤（如需自定义）

```bash
# 1. 编译电路
circom circuits/example.circom --r1cs --wasm --sym -o build

# 2. 查看约束信息
snarkjs r1cs info build/example.r1cs

# 3. 生成 zkey
snarkjs groth16 setup build/example.r1cs build/pot.ptau build/example_0000.zkey

# 4. 贡献随机性
snarkjs zkey contribute build/example_0000.zkey build/example_final.zkey --name="Contribution" -v

# 5. 导出验证密钥
snarkjs zkey export verificationkey build/example_final.zkey build/verification_key.json

# 6. 生成 Solidity verifier
snarkjs zkey export solidityverifier build/example_final.zkey build/Verifier.sol

# 7. 生成证明
snarkjs groth16 fullprove input.json build/example_js/example.wasm build/example_final.zkey

# 8. 验证证明
snarkjs groth16 verify build/verification_key.json public.json proof.json
```

---

## 💻 Node SDK 命令

```bash
cd node-sdk

# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 开发模式
npm run dev

# 生成证明
npm run generate-proof

# 验证证明
npm run verify-proof

# 运行测试
npm test
```

### 编程接口

```bash
# 使用 ts-node 运行脚本
npx ts-node scripts/generateProof.ts

# 调试模式
node --inspect-brk dist/scripts/generateProof.js
```

---

## 🔗 智能合约命令

```bash
cd smart-contracts

# 安装依赖
npm install

# 编译合约
npm run compile
# 或
npx hardhat compile

# 运行测试
npm run test
# 或
npx hardhat test

# 运行单个测试
npx hardhat test test/Verifier.test.js

# 启动本地节点
npm run node
# 或
npx hardhat node

# 部署到本地网络
npm run deploy:localhost
# 或
npx hardhat run scripts/deploy.js --network localhost

# 部署到 Sepolia 测试网
npm run deploy:sepolia
# 或
npx hardhat run scripts/deploy.js --network sepolia

# 链上验证证明
node scripts/verify-on-chain.js

# 清理
npm run clean
# 或
npx hardhat clean
```

### Hardhat 工具

```bash
# 控制台（本地网络）
npx hardhat console --network localhost

# 查看账户
npx hardhat accounts

# 查看网络
npx hardhat node

# Gas 报告
REPORT_GAS=true npx hardhat test

# 合约验证（Etherscan）
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>

# 运行自定义任务
npx hardhat run scripts/custom-task.js
```

---

## 🌐 Backend API 命令

```bash
cd backend

# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 编译 TypeScript
npm run build

# 生产模式
npm start

# 运行测试
npm test
```

### API 测试

```bash
# 健康检查
curl http://localhost:3000/health

# 生成证明
curl -X POST http://localhost:3000/api/proof/generate \
  -H "Content-Type: application/json" \
  -d '{"input": {"a": 3, "b": 11}}'

# 验证证明
curl -X POST http://localhost:3000/api/proof/verify \
  -H "Content-Type: application/json" \
  -d @proof.json

# 导出 calldata
curl -X POST http://localhost:3000/api/proof/export-calldata \
  -H "Content-Type: application/json" \
  -d @proof.json

# 获取电路信息
curl http://localhost:3000/api/circuit/info
```

---

## 🧪 测试命令汇总

```bash
# 根目录 - 运行所有测试
npm run test:all

# Rust WASM 测试
cd rust-prover && node test/test-wasm.js

# Circom 测试
cd circom-circuits && npm run test

# Node SDK 测试
cd node-sdk && npm test

# 智能合约测试
cd smart-contracts && npx hardhat test

# 集成测试（需要运行节点）
bash scripts/integration-test.sh  # 注：此脚本需创建
```

---

## 🐛 调试命令

```bash
# Rust WASM 调试
cd rust-prover
node test/test-simple.js  # 简单测试获取详细错误
RUST_BACKTRACE=1 wasm-pack build --target web

# Node.js 调试
node --inspect-brk dist/scripts/generateProof.js

# Hardhat 调试
npx hardhat test --verbose
npx hardhat console

# 查看 Circom 电路约束
cd circom-circuits
snarkjs r1cs print build/example.r1cs build/example.sym

# 导出电路约束为 JSON
snarkjs r1cs export json build/example.r1cs build/constraints.json
```

---

## 📊 性能分析

```bash
# Rust WASM 性能测试
cd rust-prover
time node test/test-wasm.js

# Gas 使用分析
cd smart-contracts
REPORT_GAS=true npx hardhat test

# 电路约束数量
cd circom-circuits
snarkjs r1cs info build/example.r1cs

# Proof 生成时间测试
cd node-sdk
time npm run generate-proof
```

---

## 🔄 持续集成命令

```bash
# CI 完整流程
bash scripts/setup.sh
npm run build:all
npm run test:all

# 格式化检查（注：需先安装相关工具）
cd rust-prover && cargo fmt --check
cd node-sdk && npm run lint  # 如果配置了
cd smart-contracts && npm run lint  # 如果配置了

# 类型检查
cd node-sdk && npx tsc --noEmit
cd backend && npx tsc --noEmit
```

---

## 🚀 部署命令

```bash
# 本地部署（Hardhat 节点）
cd smart-contracts
npx hardhat node  # 终端 1
npm run deploy:localhost  # 终端 2

# 测试网部署
npm run deploy:sepolia

# 主网部署（⚠️ 谨慎使用）
npm run deploy:mainnet

# 验证合约（Etherscan）
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

---

## 📁 文件管理

```bash
# 查看项目结构
tree -L 3 -I 'node_modules|target|dist'

# 查看代码行数
find . -name "*.rs" -o -name "*.ts" -o -name "*.sol" | xargs wc -l

# 查找特定文件
find . -name "*.circom"
find . -name "verification_key.json"

# 清理所有构建文件
npm run clean
```

---

## 🔧 故障排除命令

```bash
# 重置所有模块
bash scripts/clean.sh
bash scripts/setup.sh

# 清理并重新安装 npm 依赖
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
find . -name "package-lock.json" -delete
bash scripts/setup.sh

# 更新 Rust 工具链
rustup update

# 检查环境
rustc --version
node --version
npm --version
circom --version
```

---

## 📚 文档生成

```bash
# Rust 文档
cd rust-prover
cargo doc --open

# TypeScript 文档（需要安装 typedoc）
cd node-sdk
npx typedoc src/

# Solidity 文档（需要安装 hardhat-docgen）
cd smart-contracts
npx hardhat docgen
```

---

## 🎯 常用工作流

### 修改电路后的完整流程

```bash
# 1. 编辑电路
vim circom-circuits/circuits/example.circom

# 2. 重新构建
cd circom-circuits && npm run build

# 3. 生成新证明
cd ../node-sdk && npm run generate-proof

# 4. 验证
npm run verify-proof

# 5. 重新部署合约
cd ../smart-contracts
npm run deploy:localhost

# 6. 链上验证
node scripts/verify-on-chain.js
```

### 快速测试流程

```bash
# 一行命令运行完整测试
npm run test:all

# 或分步测试
cargo test && npm run test && npx hardhat test
```

---

**提示：** 所有脚本文件都已设置可执行权限。如果遇到权限问题，运行：
```bash
chmod +x scripts/*.sh circom-circuits/scripts/*.sh rust-prover/*.sh
```