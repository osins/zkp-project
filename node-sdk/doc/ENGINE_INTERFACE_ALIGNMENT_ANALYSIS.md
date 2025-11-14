# ZKP 双引擎接口对齐分析报告

**报告生成时间**: 2025-11-08  
**分析范围**: rust-prover (Halo2) vs circom-circuits (Groth16)  
**核心目标**: 实现两个引擎的接口完全一致，支持透明切换

---

## 🎯 核心问题

**用户要求**:
> rust-prover 和 circom-circuits 的公开接口要**严格一致**：
> - 方法名一致
> - 参数一致
> - 返回结果一致
> - node-sdk 实现统一接口
> - 用户可以**选择性切换** ZKP 方案

**当前状态**: ❌ **接口完全不一致，无法透明切换**

---

## 📊 接口对比分析

### 1. 电路清单对比

| 序号 | 电路名称 | Circom 实现 | Rust/Halo2 实现 | 接口一致性 |
|-----|---------|------------|----------------|----------|
| 1 | **Example/Multiplier** | ✅ 完整 | ❌ 无（仅 Square） | ❌ **不一致** |
| 2 | **Square** | ❌ 无 | ✅ 完整 | ❌ **不一致** |
| 3 | **AgeVerification** | ✅ 完整 | ⚠️ 基础框架 | ❌ **不一致** |
| 4 | **BalanceProof** | ✅ 完整 | ⚠️ 基础框架 | ❌ **不一致** |
| 5 | **RangeProof** | ✅ 完整 | ✅ 完整 | ⚠️ **部分一致** |
| 6 | **MerkleProof** | ✅ 完整 | ⚠️ 基础框架 | ❌ **不一致** |
| 7 | **Voting** | ✅ 完整 | ⚠️ 基础框架 | ❌ **不一致** |

**对齐覆盖率**: 0/6 = **0%** ❌

---

### 2. 详细接口对比 - AgeVerification

#### **Circom 接口**:

```circom
// circuits/production/age_verification.circom
template AgeVerification() {
    // 私密输入
    signal input age;              // 实际年龄
    signal input salt;             // 随机盐值
    signal input accountId;        // 账户 ID（未使用）
    
    // 公开输入
    signal input ageCommitment;    // 年龄承诺
    signal input minAge;           // 最小年龄
    signal input maxAge;           // 最大年龄
    
    // 公开输出
    signal output valid;           // 是否有效（0 或 1）
    
    // 约束逻辑（~600 约束）
    // 1. Poseidon 哈希验证承诺（~200 约束）
    // 2. 范围验证 (age >= minAge)（~100 约束）
    // 3. 范围验证 (age <= maxAge)（~100 约束）
    // 4. 位分解（0-255）（~200 约束）
}
```

**TypeScript 调用示例**:
```typescript
// Circom 引擎
const input = {
    age: 25,              // 私密
    salt: "0x1234...",    // 私密
    accountId: "0x5678...", // 私密
    ageCommitment: "0xabc...", // 公开
    minAge: 18,           // 公开
    maxAge: 65            // 公开
};

const proof = await prover.generateProof(input);
// proof.publicSignals = [valid, ageCommitment, minAge, maxAge]
```

---

#### **Rust/Halo2 接口**:

```rust
// rust-prover/src/circuits/age_verification.rs
pub struct AgeVerificationCircuit {
    pub age: Option<u64>,      // 实际年龄
    pub min_age: Option<u64>,  // 最小年龄
    pub max_age: Option<u64>,  // 最大年龄
}

impl Circuit<Fp> for AgeVerificationCircuit {
    fn synthesize(&self, ...) -> Result<(), Error> {
        // ❌ 只有基础框架，返回固定值 1
        // ❌ 缺少：salt, ageCommitment
        // ❌ 缺少：Poseidon 哈希约束
        // ❌ 缺少：范围验证约束
        // ❌ 缺少：位分解约束
    }
}
```

**TypeScript 调用示例**:
```typescript
// Rust/Halo2 引擎（当前）
const input = {
    age: 25,       // 私密
    minAge: 18,    // ❌ 缺少 salt
    maxAge: 65     // ❌ 缺少 ageCommitment
};

// ❌ 无对应的 WASM 接口
// wasm_generate_age_proof() 不存在
```

---

#### **接口差异总结**:

| 维度 | Circom | Rust/Halo2 | 一致性 |
|------|--------|-----------|-------|
| **输入参数** | | | |
| - age (private) | ✅ | ✅ `Option<u64>` | ✅ |
| - salt (private) | ✅ | ❌ **缺失** | ❌ |
| - ageCommitment (public) | ✅ | ❌ **缺失** | ❌ |
| - minAge (public) | ✅ | ✅ `Option<u64>` | ✅ |
| - maxAge (public) | ✅ | ✅ `Option<u64>` | ✅ |
| - accountId (private) | ✅ | ❌ **缺失** | ❌ |
| **输出** | | | |
| - valid (public) | ✅ | ⚠️ 固定为 `1` | ❌ |
| **约束逻辑** | | | |
| - Poseidon 哈希承诺 | ✅ ~200 约束 | ❌ **未实现** | ❌ |
| - 范围验证 (age >= minAge) | ✅ | ❌ **未实现** | ❌ |
| - 范围验证 (age <= maxAge) | ✅ | ❌ **未实现** | ❌ |
| - 位分解（0-255） | ✅ | ❌ **未实现** | ❌ |
| **总约束数** | ~600 | ~0（基础框架） | ❌ |
| **WASM 接口** | ✅ | ❌ **不存在** | ❌ |

**结论**: **接口完全不一致** ❌

---

### 3. 详细接口对比 - BalanceProof

#### **Circom 接口**:

```circom
// circuits/production/balance_proof.circom
template BalanceProof() {
    // 私密输入
    signal input balance;          // 实际余额
    signal input salt;             // 随机盐值
    signal input accountId;        // 账户 ID
    
    // 公开输入
    signal input balanceCommitment; // 余额承诺
    signal input requiredAmount;   // 需要的金额
    
    // 公开输出
    signal output sufficient;      // 是否充足（0 或 1）
    
    // 约束逻辑（~450 约束）
    // 1. Poseidon 哈希验证承诺（~200 约束）
    // 2. 比较 (balance >= requiredAmount)（~150 约束）
    // 3. 64位位分解（~100 约束）
}
```

---

#### **Rust/Halo2 接口**:

```rust
// rust-prover/src/circuits/balance_proof.rs
pub struct BalanceProofCircuit {
    pub balance: Option<u64>,          // 实际余额
    pub required_amount: Option<u64>,  // 需要的金额
}

impl Circuit<Fp> for BalanceProofCircuit {
    fn synthesize(&self, ...) -> Result<(), Error> {
        // ❌ 只有基础框架，返回固定值 1
        // ❌ 缺少：salt, balanceCommitment, accountId
        // ❌ 缺少：Poseidon 哈希约束
        // ❌ 缺少：比较约束
        // ❌ 缺少：位分解约束
    }
}
```

---

#### **接口差异总结**:

| 维度 | Circom | Rust/Halo2 | 一致性 |
|------|--------|-----------|-------|
| **输入参数** | | | |
| - balance (private) | ✅ | ✅ `Option<u64>` | ✅ |
| - salt (private) | ✅ | ❌ **缺失** | ❌ |
| - accountId (private) | ✅ | ❌ **缺失** | ❌ |
| - balanceCommitment (public) | ✅ | ❌ **缺失** | ❌ |
| - requiredAmount (public) | ✅ | ✅ `Option<u64>` | ✅ |
| **输出** | | | |
| - sufficient (public) | ✅ | ⚠️ 固定为 `1` | ❌ |
| **约束逻辑** | | | |
| - Poseidon 哈希承诺 | ✅ ~200 约束 | ❌ **未实现** | ❌ |
| - 比较 (balance >= requiredAmount) | ✅ | ❌ **未实现** | ❌ |
| - 64位位分解 | ✅ | ❌ **未实现** | ❌ |
| **总约束数** | ~450 | ~0（基础框架） | ❌ |
| **WASM 接口** | ✅ | ❌ **不存在** | ❌ |

**结论**: **接口完全不一致** ❌

---

## 🚨 核心问题总结

| 问题类型 | 严重程度 | 描述 |
|---------|---------|------|
| **❌ 接口不一致** | **严重** | Circom 和 Rust 的输入参数完全不同 |
| **❌ 功能不完整** | **严重** | Rust 只有基础框架，缺少核心约束逻辑 |
| **❌ 无法切换** | **严重** | node-sdk 无法透明切换引擎 |
| **❌ 测试覆盖不足** | **中等** | Rust 电路的功能未被测试 |

---

### 为什么说 "Rust/Halo2 接口覆盖率 0%"？

**真正的意思**:

```
不是测试覆盖率 0%，而是：

✅ Circom circuits 公开接口: 
   - AgeVerification(age, salt, ageCommitment, minAge, maxAge) → valid
   - BalanceProof(balance, salt, accountId, balanceCommitment, requiredAmount) → sufficient
   - MerkleProof(leaf, pathElements, pathIndices) → root
   - Voting(...) → voteHash
   - RangeProof(value, bits) → valid

❌ Rust/Halo2 对应接口:
   - AgeVerification(age, min_age, max_age) → 1  ❌ 参数不匹配
   - BalanceProof(balance, required_amount) → 1  ❌ 参数不匹配
   - MerkleProof(leaf, root) → 1               ❌ 参数不匹配
   - Voting(...) → 1                           ❌ 参数不匹配
   - RangeProof(value) → 1                     ⚠️ 部分匹配

接口对齐覆盖率: 0/5 = 0% ❌
```

**导致的问题**:
1. ❌ node-sdk 无法用统一 API 调用两个引擎
2. ❌ 用户无法透明切换 ZKP 方案
3. ❌ 双引擎架构形同虚设

---

## 🎯 node-sdk 统一接口设计

### 期望的接口设计

```typescript
// node-sdk/src/core/ZKPClient.ts

interface ZKPConfig {
    engine: 'circom' | 'halo2';           // 引擎选择
    circuitType: CircuitType;              // 电路类型
    wasmPath?: string;                     // WASM 路径
    verbose?: boolean;                     // 调试输出
}

class ZKPClient {
    constructor(config: ZKPConfig) { }
    
    // 统一接口（与引擎无关）
    async generateProof(input: CircuitInput): Promise<UnifiedProofData>
    async verify(proof: UnifiedProofData): Promise<VerificationResult>
    getCircuitInfo(): CircuitInfo
    getEngineCapabilities(): EngineCapabilities
}
```

---

### AgeVerification 的统一接口

```typescript
// 统一输入格式（Circom 和 Rust 必须一致）
interface AgeVerificationInput {
    age: number;           // 实际年龄（私密）
    salt: string;          // 随机盐值（私密）
    ageCommitment: string; // 年龄承诺（公开）- 可选，如果未提供则自动计算
    minAge: number;        // 最小年龄（公开）
    maxAge: number;        // 最大年龄（公开）
}

// 统一输出格式
interface AgeVerificationOutput {
    valid: boolean;        // 是否有效
    ageCommitment: string; // 年龄承诺（公开）
}

// 统一证明数据
interface UnifiedProofData {
    engine: 'circom' | 'halo2';
    circuitType: CircuitType;
    proof: Uint8Array;
    publicSignals: string[];  // [valid, ageCommitment, minAge, maxAge]
}
```

---

### 使用示例

```typescript
// 用户代码（与引擎无关）
const input: AgeVerificationInput = {
    age: 25,
    salt: generateRandomSalt(),
    minAge: 18,
    maxAge: 65
};

// 使用 Circom 引擎
const circomClient = new ZKPClient({
    engine: 'circom',
    circuitType: CircuitType.AGE_VERIFICATION
});
const circomProof = await circomClient.generateProof(input);
console.log(await circomClient.verify(circomProof)); // true

// 切换到 Halo2 引擎（代码完全相同）
const halo2Client = new ZKPClient({
    engine: 'halo2',  // ← 仅此处不同
    circuitType: CircuitType.AGE_VERIFICATION
});
const halo2Proof = await halo2Client.generateProof(input);  // 相同的输入
console.log(await halo2Client.verify(halo2Proof)); // true

// 验证结果应该相同
console.log(circomProof.publicSignals === halo2Proof.publicSignals); // true
```

---

## 🛠️ 实现方案

### 方案 A: 完整实现所有电路接口一致性（推荐 ⭐⭐⭐）

**工作内容**:
1. 为 Rust 的 5 个电路实现完整约束逻辑
2. 确保输入/输出参数与 Circom 严格一致
3. 添加 WASM 接口
4. node-sdk 实现统一适配器
5. 完整的双引擎测试

**详细任务**:

#### **任务 A.1: 为 Rust 电路添加完整的输入参数**

```rust
// rust-prover/src/circuits/age_verification.rs

// 当前（不完整）
pub struct AgeVerificationCircuit {
    pub age: Option<u64>,
    pub min_age: Option<u64>,
    pub max_age: Option<u64>,
}

// 需要改为（与 Circom 一致）
pub struct AgeVerificationCircuit {
    pub age: Option<u64>,           // 实际年龄
    pub salt: Option<Fp>,           // 随机盐值
    pub age_commitment: Option<Fp>, // 年龄承诺（公开）
    pub min_age: Option<u64>,       // 最小年龄（公开）
    pub max_age: Option<u64>,       // 最大年龄（公开）
}
```

**工作量**: 每个电路 2-4 小时

---

#### **任务 A.2: 实现完整的约束逻辑**

```rust
// AgeVerification 需要实现：
impl Circuit<Fp> for AgeVerificationCircuit {
    fn synthesize(&self, ...) -> Result<(), Error> {
        // 1. ✅ Poseidon 哈希约束（验证承诺）- ~200 约束
        let computed_commitment = poseidon_hash([age, salt]);
        layouter.constrain_equal(computed_commitment, age_commitment)?;
        
        // 2. ✅ 范围证明（age >= minAge）- ~100 约束
        let age_ge_min = age >= min_age;
        layouter.constrain_instance(age_ge_min.cell(), ...)?;
        
        // 3. ✅ 范围证明（age <= maxAge）- ~100 约束
        let age_le_max = age <= max_age;
        layouter.constrain_instance(age_le_max.cell(), ...)?;
        
        // 4. ✅ 位分解（0-255）- ~200 约束
        range_check_8bit(layouter, age)?;
        
        // 5. ✅ 输出约束（valid = 0 或 1）- ~10 约束
        let valid = age_ge_min.and(age_le_max);
        layouter.constrain_instance(valid.cell(), ...)?;
        
        Ok(())
    }
}
```

**工作量**: 每个电路 **8-16 小时**（需要深入理解 Halo2）

---

#### **任务 A.3: 为 Rust 添加 WASM 接口**

```rust
// rust-prover/src/lib.rs

// 当前只有 Square 电路的 WASM 接口
#[wasm_bindgen]
pub fn wasm_generate_proof(x: u32) -> Vec<u8> { ... }

// 需要为每个电路添加
#[wasm_bindgen]
pub fn wasm_generate_age_proof(
    age: u32,
    salt: String,
    min_age: u32,
    max_age: u32
) -> Vec<u8> {
    let salt_fp = Fp::from_str_vartime(&salt).unwrap();
    // 计算承诺
    let commitment = poseidon_hash(&[Fp::from(age), salt_fp]);
    
    let circuit = AgeVerificationCircuit {
        age: Some(age as u64),
        salt: Some(salt_fp),
        age_commitment: Some(commitment),
        min_age: Some(min_age as u64),
        max_age: Some(max_age as u64),
    };
    
    // 生成证明
    generate_real_proof(circuit, ...)
}

#[wasm_bindgen]
pub fn wasm_verify_age_proof(proof: &[u8]) -> bool {
    verify_real_proof(proof, ...)
}

// 同样的方式添加：
// - wasm_generate_balance_proof / wasm_verify_balance_proof
// - wasm_generate_merkle_proof / wasm_verify_merkle_proof
// - wasm_generate_voting_proof / wasm_verify_voting_proof
// - wasm_generate_range_proof / wasm_verify_range_proof
```

**工作量**: 每个电路 1-2 小时

---

#### **任务 A.4: node-sdk 实现统一适配器**

```typescript
// node-sdk/src/engines/halo2/RustProver.ts

class RustProver implements IProver {
    async generateProof(input: CircuitInput): Promise<UnifiedProofData> {
        switch (this.circuitType) {
            case CircuitType.AGE_VERIFICATION:
                // 调用 wasm_generate_age_proof
                const proof = this.wasm.wasm_generate_age_proof(
                    input.age,
                    input.salt,
                    input.minAge,
                    input.maxAge
                );
                
                return {
                    engine: 'halo2',
                    circuitType: this.circuitType,
                    proof: proof,
                    publicSignals: extractPublicSignals(proof)
                };
            
            case CircuitType.BALANCE_PROOF:
                // 调用 wasm_generate_balance_proof
                const proof = this.wasm.wasm_generate_balance_proof(
                    input.balance,
                    input.salt,
                    input.accountId,
                    input.requiredAmount
                );
                
                return {
                    engine: 'halo2',
                    circuitType: this.circuitType,
                    proof: proof,
                    publicSignals: extractPublicSignals(proof)
                };
            
            // ... 其他电路
        }
    }
}
```

**工作量**: 4-8 小时

---

#### **任务 A.5: 添加完整的测试**

```typescript
// node-sdk/src/__tests__/dual-engine.test.ts

describe('AgeVerification - 双引擎测试', () => {
    const testCases = [
        { age: 25, minAge: 18, maxAge: 65, expected: true },
        { age: 17, minAge: 18, maxAge: 65, expected: false },
        { age: 70, minAge: 18, maxAge: 65, expected: false },
    ];
    
    test.each(testCases)('Circom 引擎 - age: %i, minAge: %i, maxAge: %i', 
        async ({ age, minAge, maxAge, expected }) => {
            const client = new ZKPClient({
                engine: ProofEngine.CIRCOM,
                circuitType: CircuitType.AGE_VERIFICATION
            });
            
            await client.init();
            
            const input = {
                age,
                salt: generateRandomSalt(),
                minAge,
                maxAge
            };
            
            const proof = await client.generateProof(input);
            const result = await client.verify(proof);
            
            expect(result.isValid).toBe(expected);
        }
    );
    
    test.each(testCases)('Halo2 引擎 - age: %i, minAge: %i, maxAge: %i', 
        async ({ age, minAge, maxAge, expected }) => {
            const client = new ZKPClient({
                engine: ProofEngine.HALO2,
                circuitType: CircuitType.AGE_VERIFICATION
            });
            
            await client.init();
            
            const input = {
                age,
                salt: generateRandomSalt(),
                minAge,
                maxAge
            };
            
            const proof = await client.generateProof(input);
            const result = await client.verify(proof);
            
            // 验证结果与 Circom 引擎一致
            expect(result.isValid).toBe(expected);
        }
    );
    
    test('双引擎结果对比', async () => {
        const input = {
            age: 25,
            salt: 'same_salt_123',  // 使用相同的盐值
            minAge: 18,
            maxAge: 65
        };
        
        // Circom 引擎
        const circomClient = new ZKPClient({
            engine: ProofEngine.CIRCOM,
            circuitType: CircuitType.AGE_VERIFICATION
        });
        const circomProof = await circomClient.generateProof(input);
        
        // Halo2 引擎
        const halo2Client = new ZKPClient({
            engine: ProofEngine.HALO2,
            circuitType: CircuitType.AGE_VERIFICATION
        });
        const halo2Proof = await halo2Client.generateProof(input);
        
        // 验证公开信号一致
        expect(circomProof.publicSignals[0]).toBe(halo2Proof.publicSignals[0]); // valid
        expect(circomProof.publicSignals[1]).toBe(halo2Proof.publicSignals[1]); // ageCommitment
        
        // 验证结果一致
        const circomResult = await circomClient.verify(circomProof);
        const halo2Result = await halo2Client.verify(halo2Proof);
        expect(circomResult.isValid).toBe(halo2Result.isValid);
    });
});
```

**工作量**: 每个电路 2-4 小时

---

### 总工作量估算

| 任务 | 电路数量 | 单个工时 | 总工时 |
|------|---------|---------|-------|
| A.1 添加完整输入参数 | 5 个 | 2-4 小时 | **10-20 小时** |
| A.2 实现完整约束逻辑 | 5 个 | 8-16 小时 | **40-80 小时** |
| A.3 添加 WASM 接口 | 5 个 | 1-2 小时 | **5-10 小时** |
| A.4 node-sdk 适配器 | 1 次 | 4-8 小时 | **4-8 小时** |
| A.5 完整测试 | 5 个 | 2-4 小时 | **10-20 小时** |
| **总计** | | | **69-138 小时** |

**预估**: **2-3 周全职工作**（1 人）

**优点**:
- ✅ 真正的接口一致性
- ✅ 用户可以透明切换引擎
- ✅ 双引擎完整覆盖
- ✅ 项目架构完整

**缺点**:
- ❌ 工作量巨大（2-3 周）
- ❌ 需要深入理解 Halo2
- ❌ 需要理解 Poseidon 哈希在 Halo2 中的实现

---

### 方案 B: 仅实现 1-2 个核心电路的完整对齐（推荐 ⭐⭐）

**工作内容**:
1. 选择 1-2 个最重要的电路（如 AgeVerification, BalanceProof）
2. 完整实现这些电路的 Rust 版本
3. 其他电路保持当前状态
4. 添加双引擎测试

**优点**:
- ✅ 快速验证可行性
- ✅ 工作量可控
- ✅ 可以展示双引擎切换能力
- ✅ 为后续完整实现铺路

**缺点**:
- ⚠️ 只有部分电路支持双引擎
- ⚠️ 用户需要知道哪些电路支持切换

**工作量**: **15-30 小时**（每个电路）

**实施步骤**:
1. **第 1 周**: 完整实现 AgeVerification（15-30 小时）
2. **验证**: 测试双引擎切换功能
3. **第 2 周**: 完整实现 BalanceProof（15-30 小时）
4. **总结**: 编写实施指南，为其他电路提供模板

---

### 方案 C: 放弃接口一致性，改为引擎特定接口（不推荐 ❌）

**工作内容**:
1. 接受 Circom 和 Rust 接口不一致
2. node-sdk 为每个引擎提供独立 API
3. 用户需要了解两个引擎的差异

**示例**:
```typescript
// 不同的接口
const circomClient = new CircomClient(...);
const halo2Client = new Halo2Client(...);

// Circom 接口
await circomClient.generateAgeProof({
    age, salt, ageCommitment, minAge, maxAge
});

// Halo2 接口（不同）
await halo2Client.generateAgeProof({
    age, minAge, maxAge  // 缺少 salt 和 commitment
});
```

**优点**:
- ✅ 无需修改现有代码
- ✅ 工作量为 0

**缺点**:
- ❌ 无法透明切换
- ❌ 用户体验差
- ❌ 违背设计初衷
- ❌ 失去双引擎架构的意义

---

## 📋 推荐实施计划

### 立即行动（方案 B）

**阶段 1: AgeVerification 电路对齐**（1-2 周）

1. **Rust 实现**（15-25 小时）
   - [ ] 添加完整输入参数（age, salt, ageCommitment, minAge, maxAge）
   - [ ] 实现 Poseidon 哈希约束
   - [ ] 实现范围证明约束
   - [ ] 实现位分解约束
   - [ ] 添加 WASM 接口

2. **node-sdk 适配**（4-6 小时）
   - [ ] RustProver 支持 AgeVerification
   - [ ] RustVerifier 支持 AgeVerification
   - [ ] 统一输入/输出格式

3. **测试**（2-4 小时）
   - [ ] 单元测试
   - [ ] 双引擎对比测试
   - [ ] 性能对比测试

**验收标准**:
- ✅ AgeVerification 接口 100% 一致
- ✅ 相同输入产生相同的公开输出
- ✅ 用户可以透明切换引擎

---

**阶段 2: BalanceProof 电路对齐**（1-2 周）

1. **Rust 实现**（15-25 小时）
   - [ ] 添加完整输入参数
   - [ ] 实现约束逻辑
   - [ ] 添加 WASM 接口

2. **node-sdk 适配**（4-6 小时）
3. **测试**（2-4 小时）

**验收标准**:
- ✅ BalanceProof 接口 100% 一致
- ✅ 双引擎切换正常

---

**阶段 3: 其他电路对齐**（可选，2-4 周）

根据阶段 1-2 的经验，完成其他 3 个电路的对齐。

---

## 📊 成功标准

### 接口一致性验证

**验证清单**:
- [ ] 所有电路的输入参数完全一致（名称、类型、顺序）
- [ ] 所有电路的输出格式完全一致
- [ ] 相同输入产生相同的公开输出（publicSignals）
- [ ] 约束逻辑等价（虽然实现方式不同）

---

### 透明切换验证

**测试代码**:
```typescript
test('用户可以透明切换引擎', async () => {
    const input = {
        age: 25,
        salt: 'test_salt',
        minAge: 18,
        maxAge: 65
    };
    
    // 使用 Circom
    const circomClient = new ZKPClient({
        engine: 'circom',
        circuitType: CircuitType.AGE_VERIFICATION
    });
    const circomProof = await circomClient.generateProof(input);
    
    // 切换到 Halo2（仅修改一行）
    const halo2Client = new ZKPClient({
        engine: 'halo2',  // ← 仅此处不同
        circuitType: CircuitType.AGE_VERIFICATION
    });
    const halo2Proof = await halo2Client.generateProof(input);
    
    // 验证结果一致
    expect(circomProof.publicSignals).toEqual(halo2Proof.publicSignals);
    
    // 交叉验证（Circom 证明可以用 Halo2 验证吗？）
    // 注：由于证明系统不同（Groth16 vs Halo2），无法交叉验证
    // 但公开输出应该相同
});
```

---

## 💡 总结

**核心问题**:
> Rust/Halo2 和 Circom 的接口完全不一致，导致无法实现透明切换引擎的目标。

**关键差异**:
1. ❌ **参数不匹配**: Rust 缺少 salt, commitment 等关键参数
2. ❌ **功能不完整**: Rust 只有基础框架，无真实约束逻辑
3. ❌ **无 WASM 接口**: 除 Square 外，其他电路无 WASM 绑定
4. ❌ **无法测试**: 接口不一致导致无法编写统一的测试

**推荐方案**: ✅ **方案 B**（先实现 1-2 个核心电路的完整对齐）

**工作量**: **30-60 小时**（2 个核心电路）

**验收标准**:
- ✅ 接口 100% 一致
- ✅ 用户可以透明切换引擎
- ✅ 相同输入产生相同的公开输出

---

**一句话精髓**:
> **"双引擎架构的核心是接口一致性。当前 Rust 电路只是基础框架，需要实现完整的约束逻辑和匹配的输入参数，才能真正实现透明切换。"**

---

## 📚 相关文档

- [Rust Prover README](../../rust-prover/README.md)
- [Circom Circuits README](../../circom-circuits/README.md)
- [Node SDK README](../README.md)
- [Dual Engine Implementation Guide](../DUAL_ENGINE_IMPLEMENTATION_GUIDE.md)
- [Integration Test Report](../INTEGRATION_TEST_REPORT.md)

---

**最后更新**: 2025-11-08  
**状态**: 待实施  
**优先级**: 高
