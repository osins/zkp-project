# ZKP Node SDK

零知识证明 Node.js SDK，提供简洁的 API 用于生成和验证零知识证明。

## ✅ 集成状态

✅ **已完全集成 circom-circuits**  
✅ **所有测试通过 (16/16)**  
✅ **通过率: 100%**

详细测试报告: [INTEGRATION_TEST_REPORT.md](./INTEGRATION_TEST_REPORT.md)

## 🚀 快速开始

### 安装依赖

```bash
cd node-sdk
npm install
```

### 构建项目

```bash
npm run build
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm test -- --coverage

# 运行集成验证
npx ts-node scripts/test-integration.ts
```

## 📖 使用示例

### 1. 生成零知识证明

```typescript
import { ProverClient } from 'zkp-node-sdk';
import * as path from 'path';

// 初始化 Prover
const buildDir = path.join(__dirname, '../circom-circuits/build');
const prover = new ProverClient('example', buildDir);

// 准备输入（证明知道 a 和 b 使得 a * b = c）
const input = {
    a: 3,
    b: 11
};

// 生成证明
const proofData = await prover.generateProof(input);
console.log('公开信号:', proofData.publicSignals); // ['33']

// 保存证明
prover.saveProof(proofData, './proof.json');
```

### 2. 验证零知识证明

```typescript
import { VerifierClient, ProverClient } from 'zkp-node-sdk';
import * as path from 'path';

// 初始化 Verifier
const vkeyPath = path.join(__dirname, '../circom-circuits/build/verification_key.json');
const verifier = new VerifierClient(vkeyPath);

// 加载证明
const proofData = ProverClient.loadProof('./proof.json');

// 验证证明
const result = await verifier.verify(proofData);
console.log('验证结果:', result.verified); // true
console.log('验证时间:', new Date(result.timestamp).toISOString());
```

### 3. 生成 Solidity Calldata（用于链上验证）

```typescript
import { ProverClient } from 'zkp-node-sdk';

const prover = new ProverClient('example', buildDir);
const proofData = await prover.generateProof({ a: 3, b: 11 });

// 生成 Solidity calldata
const calldata = await prover.exportSolidityCallData(proofData);
console.log('Calldata:', calldata);

// 可直接用于智能合约的 verifyProof 函数
```

### 4. 使用命令行脚本

```bash
# 生成证明
npm run generate-proof

# 验证证明
npm run verify-proof
```

## 📚 API 文档

### ProverClient

证明生成客户端，用于创建零知识证明。

#### 构造函数

```typescript
constructor(circuitName: string, buildDir: string = '../circom-circuits/build')
```

- `circuitName`: 电路名称（例如: 'example', 'age_verification'）
- `buildDir`: 电路构建产物目录

#### 方法

##### generateProof(input: CircuitInput): Promise<ProofData>

生成零知识证明。

```typescript
const proofData = await prover.generateProof({ a: 3, b: 11 });
```

##### exportSolidityCallData(proofData: ProofData): Promise<string>

导出 Solidity calldata，用于链上验证。

```typescript
const calldata = await prover.exportSolidityCallData(proofData);
```

##### saveProof(proofData: ProofData, outputPath: string): void

保存证明到文件。

```typescript
prover.saveProof(proofData, './proof.json');
```

##### static loadProof(filePath: string): ProofData

从文件加载证明。

```typescript
const proofData = ProverClient.loadProof('./proof.json');
```

### VerifierClient

证明验证客户端，用于验证零知识证明。

#### 构造函数

```typescript
constructor(vkeyPath: string = '../circom-circuits/build/verification_key.json')
```

- `vkeyPath`: 验证密钥文件路径

#### 方法

##### verify(proofData: ProofData): Promise<VerificationResult>

链下验证零知识证明。

```typescript
const result = await verifier.verify(proofData);
console.log(result.verified); // true/false
```

##### getVerificationKeyInfo(): any

获取验证密钥信息。

```typescript
const info = verifier.getVerificationKeyInfo();
console.log(info.protocol); // 'groth16'
console.log(info.curve);    // 'bn128'
```

##### verifyPublicSignals(publicSignals: string[], expected: string[]): boolean

验证公开信号是否匹配预期值。

```typescript
const isMatch = verifier.verifyPublicSignals(['33', '1'], ['33', '1']);
console.log(isMatch); // true
```

### ContractClient

智能合约交互客户端（用于链上验证）。

#### 构造函数

```typescript
constructor(
    contractAddress: string,
    providerUrl: string,
    privateKey?: string
)
```

#### 方法

##### verifyProof(proofData: ProofData): Promise<boolean>

在链上验证证明。

```typescript
const verified = await contractClient.verifyProof(proofData);
console.log('链上验证结果:', verified);
```

## 🧪 测试

### 运行单元测试

```bash
npm test
```

### 运行集成测试

```bash
npx ts-node scripts/test-integration.ts
```

### 测试覆盖

- ProverClient: 7 项测试 ✅
- VerifierClient: 5 项测试 ✅
- 完整流程: 2 项测试 ✅
- 错误处理: 2 项测试 ✅

**总计: 16 项测试，100% 通过**

## 📁 项目结构

```
node-sdk/
├── src/
│   ├── index.ts              # 主入口，导出所有接口
│   ├── proverClient.ts       # 证明生成客户端
│   ├── verifierClient.ts     # 证明验证客户端
│   ├── contractClient.ts     # 智能合约客户端
│   └── __tests__/
│       └── integration.test.ts # 集成测试
│
├── scripts/
│   ├── generateProof.ts      # 证明生成脚本
│   ├── verifyProof.ts        # 证明验证脚本
│   └── test-integration.ts   # 集成验证脚本
│
├── dist/                     # 编译输出（TypeScript → JavaScript）
├── package.json              # 项目配置
├── tsconfig.json             # TypeScript 配置
├── jest.config.js            # Jest 测试配置
└── README.md                 # 本文档
```

## 🔗 与 Circom Circuits 集成

node-sdk 依赖 circom-circuits 提供的构建产物：

```
circom-circuits/build/
├── example_js/
│   └── example.wasm          # WASM 运行时
├── example_final.zkey        # 证明密钥
└── verification_key.json     # 验证密钥
```

**前置条件**: 确保 circom-circuits 已正确构建。

```bash
cd ../circom-circuits
npm run build:example
```

## 🛠️ 开发

### 编译 TypeScript

```bash
npm run build
```

### 开发模式

```bash
npm run dev
```

### 清理构建产物

```bash
npm run clean
```

## 🔍 验证集成

运行集成验证脚本确认一切正常：

```bash
npx ts-node scripts/test-integration.ts
```

预期输出：

```
🚀 Node SDK 与 Circom Circuits 集成验证
============================================================
✅ 检查 circom-circuits 构建产物 (0ms)
✅ 初始化 ProverClient (0ms)
✅ 生成零知识证明 (1186ms)
✅ 验证公开信号计算（3 * 11 = 33） (0ms)
✅ 初始化 VerifierClient (1ms)
✅ 链下验证零知识证明 (103ms)
✅ 导出 Solidity calldata (0ms)
✅ 保存和加载证明 (1186ms)
✅ 测试多组不同输入 (3560ms)

============================================================
📊 测试总结

总测试数: 9
✅ 通过: 9
❌ 失败: 0
⏱️  总耗时: 6036ms
📈 通过率: 100.00%

✅ 集成验证成功！node-sdk 已正确集成 circom-circuits
```

## 📋 TypeScript 类型定义

```typescript
// 证明数据
interface ProofData {
    proof: any;
    publicSignals: string[];
}

// 电路输入
interface CircuitInput {
    [key: string]: number | string | bigint;
}

// 验证结果
interface VerificationResult {
    verified: boolean;
    timestamp: number;
}
```

## 🐛 常见问题

### Q: WASM file not found

**A**: 确保 circom-circuits 已构建：

```bash
cd ../circom-circuits
npm run build:example
```

### Q: Verification key not found

**A**: 检查验证密钥路径是否正确：

```typescript
const vkeyPath = path.join(__dirname, '../circom-circuits/build/verification_key.json');
const verifier = new VerifierClient(vkeyPath);
```

### Q: 测试超时

**A**: 证明生成需要时间，可以增加 Jest 超时时间：

```javascript
// jest.config.js
module.exports = {
  testTimeout: 60000, // 60秒
};
```

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系

如有问题，请在 GitHub 上提交 Issue。

---

**最后更新**: 2025-11-08  
**版本**: 1.0.0  
**状态**: ✅ 生产就绪
