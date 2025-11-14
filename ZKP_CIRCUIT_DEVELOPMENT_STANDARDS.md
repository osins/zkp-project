# ZKP 电路开发规范（强制执行）

**文档版本**: 2.0.0  
**创建日期**: 2025-11-08  
**强制执行**: ✅  
**适用范围**: 所有 ZKP 电路（Circom, Halo2, 等）

---

## 🎯 核心原则

> **"零知识证明的核心是验证计算的正确性，不是欺骗验证者。"**

> **"返回固定值 = 欺骗 = 绝对禁止。"**

> **"如果电路没有真实验证逻辑，不要假装它能工作。"**

---

## 🚫 铁律 1：严禁返回固定值（欺骗行为）

### ❌ 这是欺骗行为，绝对禁止！

**规则**: 电路输出**必须**是真实计算的结果，**严禁**返回编译时固定的常量值。

**违规判定**: 如果输出值在编译时已确定，与实际输入无关，则构成违规。

---

### 禁止的行为（违规示例）

#### ❌ **违规示例 1: Rust/Halo2 - 直接返回固定值**

```rust
// ❌ 严重违规！这是欺骗！
pub struct AgeVerificationCircuit {
    pub age: Option<u64>,
    pub min_age: Option<u64>,
    pub max_age: Option<u64>,
}

impl Circuit<Fp> for AgeVerificationCircuit {
    fn synthesize(&self, layouter: ...) -> Result<(), Error> {
        // ❌ 直接返回固定值 1，完全不验证逻辑
        let valid = layouter.assign_region(|| "output", |mut region| {
            region.assign_advice(
                || "valid", 
                self.config.advice[0], 
                0, 
                || Value::known(Fp::one())  // ❌ 固定返回 1（欺骗！）
            )
        })?;
        
        layouter.constrain_instance(valid.cell(), instance, 0)?;
        Ok(())
    }
}
```

**问题**: 
- 无论输入什么年龄，都返回 `valid = 1`
- 完全没有验证 `age >= min_age` 和 `age <= max_age`
- 这是**欺骗行为**，不是零知识证明

---

#### ❌ **违规示例 2: Circom - 硬编码输出**

```circom
// ❌ 严重违规！
template AgeVerification() {
    signal input age;
    signal input minAge;
    signal input maxAge;
    
    signal output valid;
    
    // ❌ 硬编码输出为 1，不验证任何逻辑
    valid <== 1;  // ❌ 欺骗！
}
```

**问题**:
- 无论 `age` 是否在 `[minAge, maxAge]` 范围内，都返回 `valid = 1`
- 这是**假证明**

---

#### ❌ **违规示例 3: 输出与输入无关**

```rust
// ❌ 严重违规！输出与输入完全无关！
pub struct BalanceProofCircuit {
    pub balance: Option<u64>,
    pub required_amount: Option<u64>,
}

impl Circuit<Fp> for BalanceProofCircuit {
    fn synthesize(&self, layouter: ...) -> Result<(), Error> {
        // ❌ 忽略所有输入，直接返回固定值
        let sufficient = layouter.assign_region(|| "output", |mut region| {
            region.assign_advice(
                || "sufficient", 
                config.advice[0], 
                0, 
                || Value::known(Fp::one())  // ❌ 与 balance 无关（欺骗！）
            )
        })?;
        
        // ❌ 没有验证 balance >= required_amount
        layouter.constrain_instance(sufficient.cell(), instance, 0)?;
        Ok(())
    }
}
```

**问题**:
- 即使 `balance = 0`, `required_amount = 1000000`，也返回 `sufficient = 1`
- 完全没有比较逻辑

---

#### ❌ **违规示例 4: 缺少核心约束逻辑**

```rust
// ❌ 严重违规！基础框架伪装成完整实现
pub struct MerkleProofCircuit {
    pub leaf: Option<Fp>,
    pub path_elements: Option<Vec<Fp>>,
    pub path_indices: Option<Vec<bool>>,
    pub root: Option<Fp>,
}

impl Circuit<Fp> for MerkleProofCircuit {
    fn synthesize(&self, layouter: ...) -> Result<(), Error> {
        // ❌ 没有实现 Merkle 路径验证
        // ❌ 没有实现哈希计算
        // ❌ 直接返回固定值
        
        let valid = layouter.assign_region(|| "output", |mut region| {
            region.assign_advice(
                || "valid", 
                config.advice[0], 
                0, 
                || Value::known(Fp::one())  // ❌ 欺骗！
            )
        })?;
        
        layouter.constrain_instance(valid.cell(), instance, 0)?;
        Ok(())
    }
}
```

**问题**:
- 声称验证 Merkle 证明，实际什么都没验证
- 这是**欺骗性基础框架**

---

### ✅ 正确的实现

#### ✅ **正确示例 1: Rust/Halo2 - 真实验证逻辑**

```rust
// ✅ 正确：输出是真实验证的结果
pub struct AgeVerificationCircuit {
    pub age: Option<u64>,
    pub salt: Option<Fp>,
    pub age_commitment: Option<Fp>,
    pub min_age: Option<u64>,
    pub max_age: Option<u64>,
}

impl Circuit<Fp> for AgeVerificationCircuit {
    fn synthesize(&self, layouter: ...) -> Result<(), Error> {
        let age = self.age.unwrap();
        let min_age = self.min_age.unwrap();
        let max_age = self.max_age.unwrap();
        let salt = self.salt.unwrap();
        
        // ✅ 1. 验证承诺（Poseidon 哈希）
        let computed_commitment = poseidon_hash(layouter, &[
            Fp::from(age), 
            salt
        ])?;
        layouter.constrain_equal(
            computed_commitment.cell(), 
            self.age_commitment.unwrap().cell()
        )?;
        
        // ✅ 2. 验证 age >= min_age（真实比较）
        let age_ge_min = is_greater_or_equal_chip(
            layouter, 
            Fp::from(age), 
            Fp::from(min_age)
        )?;
        
        // ✅ 3. 验证 age <= max_age（真实比较）
        let age_le_max = is_less_or_equal_chip(
            layouter, 
            Fp::from(age), 
            Fp::from(max_age)
        )?;
        
        // ✅ 4. 输出 = age_ge_min AND age_le_max（真实计算结果）
        let valid = and_gate_chip(layouter, age_ge_min, age_le_max)?;
        //          ^^^^^^^^^^^^^^ ✅ 真实验证结果，不是固定值
        
        layouter.constrain_instance(valid.cell(), instance, 0)?;
        Ok(())
    }
}
```

**正确之处**:
1. ✅ 验证了 Poseidon 哈希承诺
2. ✅ 真实比较了 `age >= min_age`
3. ✅ 真实比较了 `age <= max_age`
4. ✅ 输出是逻辑运算的结果，不是固定值
5. ✅ 约束数量 ~600（与复杂度匹配）

---

#### ✅ **正确示例 2: Circom - 完整约束验证**

```circom
// ✅ 正确：完整的范围验证
template AgeVerification() {
    signal input age;
    signal input salt;
    signal input minAge;
    signal input maxAge;
    signal input ageCommitment;
    
    signal output valid;
    
    // ✅ 1. 验证承诺（Poseidon 哈希）
    component hasher = Poseidon(2);
    hasher.inputs[0] <== age;
    hasher.inputs[1] <== salt;
    ageCommitment === hasher.out;  // ✅ 真实验证
    
    // ✅ 2. 验证 age >= minAge
    component ageGeMin = GreaterEqThan(8);
    ageGeMin.in[0] <== age;
    ageGeMin.in[1] <== minAge;
    
    // ✅ 3. 验证 age <= maxAge
    component ageLeMax = LessEqThan(8);
    ageLeMax.in[0] <== age;
    ageLeMax.in[1] <== maxAge;
    
    // ✅ 4. 输出 = ageGeMin AND ageLeMax（真实结果）
    valid <== ageGeMin.out * ageLeMax.out;
    //        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ ✅ 真实逻辑运算，不是固定值
}
```

**正确之处**:
1. ✅ 验证了哈希承诺
2. ✅ 使用 `GreaterEqThan` 真实比较
3. ✅ 使用 `LessEqThan` 真实比较
4. ✅ 输出是逻辑运算的结果
5. ✅ 约束数量 ~600

---

#### ✅ **正确示例 3: Merkle 证明 - 完整路径验证**

```rust
// ✅ 正确：完整的 Merkle 路径验证
impl Circuit<Fp> for MerkleProofCircuit {
    fn synthesize(&self, layouter: ...) -> Result<(), Error> {
        let leaf = self.leaf.unwrap();
        let path_elements = self.path_elements.as_ref().unwrap();
        let path_indices = self.path_indices.as_ref().unwrap();
        let expected_root = self.root.unwrap();
        
        // ✅ 1. 从叶节点开始
        let mut current_hash = leaf;
        
        // ✅ 2. 沿着路径向上哈希（真实计算）
        for i in 0..path_elements.len() {
            let path_element = path_elements[i];
            let is_left = path_indices[i];
            
            // ✅ 根据方向选择哈希顺序
            let (left, right) = if is_left {
                (current_hash, path_element)
            } else {
                (path_element, current_hash)
            };
            
            // ✅ 计算父节点哈希
            current_hash = poseidon_hash(layouter, &[left, right])?;
        }
        
        // ✅ 3. 验证计算出的根与期望根一致（真实验证）
        layouter.constrain_equal(
            current_hash.cell(), 
            expected_root.cell()
        )?;
        
        // ✅ 4. 输出验证结果（基于真实计算）
        let valid = is_equal_chip(layouter, current_hash, expected_root)?;
        layouter.constrain_instance(valid.cell(), instance, 0)?;
        
        Ok(())
    }
}
```

**正确之处**:
1. ✅ 完整实现了 Merkle 路径验证算法
2. ✅ 每一步哈希计算都是真实的
3. ✅ 输出基于真实的路径验证结果
4. ✅ 约束数量与路径深度成正比

---

### 强制要求

**每个电路必须满足以下所有条件**:

#### 1. ✅ **输出必须依赖输入**

- 不同的输入**必须**产生不同的输出
- 输出**不能**是编译时固定的常量
- 输出**必须**是电路逻辑计算的结果

**验证方法**:
```rust
// 测试：不同输入产生不同输出
#[test]
fn test_output_depends_on_input() {
    let circuit1 = AgeVerificationCircuit { age: 25, ... };
    let circuit2 = AgeVerificationCircuit { age: 17, ... };
    
    let output1 = generate_proof(circuit1);
    let output2 = generate_proof(circuit2);
    
    // ✅ 输出应该不同（25 通过，17 失败）
    assert_ne!(output1.valid, output2.valid);
}
```

---

#### 2. ✅ **必须包含完整的约束逻辑**

- 所有声称的验证逻辑都**必须**实现
- **不能**省略任何关键约束
- 约束数量应该与电路复杂度**匹配**

**验证清单**:
```
☐ 所有输入参数都被使用？
☐ 所有约束都已实现？
☐ 约束数量合理？（不能太少）
☐ 没有硬编码的输出？
```

**示例**:
- AgeVerification: ~600 约束（哈希 + 范围检查 + 位分解）
- BalanceProof: ~450 约束（哈希 + 比较 + 位分解）
- MerkleProof: ~(200 * 深度) 约束（每层 Poseidon 哈希）

---

#### 3. ✅ **必须有测试验证正确性**

**正常输入测试**:
```rust
#[test]
fn test_valid_age() {
    let circuit = AgeVerificationCircuit {
        age: 25,
        min_age: 18,
        max_age: 65,
        ...
    };
    
    let proof = generate_proof(circuit);
    assert_eq!(proof.public_signals[0], 1); // valid = 1
}
```

**无效输入测试**:
```rust
#[test]
fn test_invalid_age_too_young() {
    let circuit = AgeVerificationCircuit {
        age: 17,  // < 18
        min_age: 18,
        max_age: 65,
        ...
    };
    
    let proof = generate_proof(circuit);
    assert_eq!(proof.public_signals[0], 0); // valid = 0 ✅
}
```

---

#### 4. ✅ **必须有失败测试**

**目的**: 验证电路能够**拒绝**无效输入

**示例**:
```rust
#[test]
fn test_invalid_inputs_fail() {
    // 测试 1: 年龄太小
    assert_eq!(verify_age(17, 18, 65), false);
    
    // 测试 2: 年龄太大
    assert_eq!(verify_age(70, 18, 65), false);
    
    // 测试 3: 错误的承诺
    let result = verify_age_with_wrong_commitment(25, 18, 65);
    assert!(result.is_err()); // ✅ 应该失败
}
```

**关键点**:
- ❌ 如果所有输入都返回成功，说明电路可能返回固定值
- ✅ 必须有失败的测试用例

---

### 验证清单（每次提交前必查）

```
☐ 1. 输出是否依赖输入？
  ├─ 是 → 继续
  └─ 否 → ❌ 违规！必须修改

☐ 2. 是否包含所有声称的约束逻辑？
  ├─ 是 → 继续
  └─ 否 → ❌ 违规！必须补充

☐ 3. 约束数量是否合理？
  ├─ 是（>= 预期的 50%）→ 继续
  └─ 否（太少）→ ❌ 可能缺少约束

☐ 4. 是否有测试验证正确性？
  ├─ 是 → 继续
  └─ 否 → ❌ 违规！必须添加测试

☐ 5. 是否有失败测试？
  ├─ 是 → 继续
  └─ 否 → ❌ 违规！必须添加失败测试

☐ 6. 是否返回固定值？
  ├─ 否 → ✅ 通过
  └─ 是 → ❌ 严重违规！立即修改

☐ 7. 是否有代码审查？
  ├─ 是（至少 2 人）→ ✅ 通过
  └─ 否 → ⚠️ 必须审查
```

---

### 违规后果

**返回固定值是严重的欺骗行为，后果包括**:

1. ❌ **代码审查不通过** - 立即拒绝 PR
2. ❌ **必须立即修改** - 不允许合并到主分支
3. ❌ **相关测试无效** - 所有基于该电路的测试都无效
4. ❌ **电路标记为"不可用"** - 必须在文档中明确标记
5. ❌ **影响项目可信度** - 这是安全问题

---

## 🚫 铁律 2：严禁使用 MockProver（生产环境）

**规则**: 生产环境代码**严禁**使用 MockProver，必须使用真实的证明生成和验证。

### ❌ 禁止的行为

```rust
// ❌ 严重违规！MockProver 不生成真实证明
#[test]
fn test_circuit() {
    let circuit = MyCircuit { ... };
    let prover = MockProver::run(8, &circuit, vec![]).unwrap();
    prover.assert_satisfied();  // ❌ 这不是真实证明！
}
```

### ✅ 正确的实现

```rust
// ✅ 正确：使用真实证明
#[test]
fn test_real_proof() {
    let params = Params::<EqAffine>::new(8);
    let circuit = MyCircuit { x: Some(5) };
    let vk = keygen_vk(&params, &circuit).unwrap();
    let pk = keygen_pk(&params, vk, &circuit).unwrap();
    
    // ✅ 生成真实证明
    let mut proof = vec![];
    let mut transcript = Blake2bWrite::init(&mut proof);
    create_proof(
        &params, 
        &pk, 
        &[circuit], 
        &[&[&[Fp::from(25)]]], 
        &mut OsRng, 
        &mut transcript
    ).unwrap();
    
    // ✅ 验证真实证明
    assert!(!proof.is_empty());
    
    let mut verifier_transcript = Blake2bRead::init(&proof[..]);
    let strategy = SingleStrategy::new(&params);
    verify_proof(&params, &vk, strategy, &[&[&[Fp::from(25)]]], &mut verifier_transcript).unwrap();
}
```

**原因**:
- MockProver 仅检查约束满足性，不生成真实证明
- 生产环境必须验证真实证明的生成和验证流程
- MockProver 可以用于开发阶段快速调试，但不能替代真实测试

---

## 🚫 铁律 3：严禁跳过测试

**规则**: **严禁**使用任何形式的测试跳过语法。

### ❌ 禁止的行为

```javascript
// ❌ JavaScript/TypeScript
describe.skip('测试套件', () => { ... });
test.skip('测试用例', () => { ... });
it.skip('测试用例', () => { ... });
xit('测试用例', () => { ... });
xdescribe('测试套件', () => { ... });

// ❌ Rust
#[ignore]
#[test]
fn test_something() { ... }

// ❌ 注释掉测试
/*
#[test]
fn test_important_feature() { ... }
*/
```

**原则**:
> **"测试失败优于测试跳过"**  
> **"问题必须显现，不得掩盖"**

详细规则请参考: [TESTING_STANDARDS.md](./TESTING_STANDARDS.md)

---

## 📋 完整的开发流程

### 1. 需求分析阶段

```
☐ 明确电路功能
☐ 定义输入/输出
☐ 确定约束逻辑
☐ 预估约束数量
```

---

### 2. 设计阶段

```
☐ 编写设计文档
☐ 定义电路接口
☐ 设计测试用例
☐ 评审设计方案
```

---

### 3. 实现阶段

```
☐ 实现电路逻辑
☐ 添加完整注释
☐ 实现所有约束
☐ 自检约束完整性
```

**关键点**:
- ✅ 每个约束都有注释说明
- ✅ 输出必须基于真实计算
- ❌ 绝不返回固定值

---

### 4. 测试阶段

```
☐ 编写正常输入测试
☐ 编写边界输入测试
☐ 编写无效输入测试（必须失败）
☐ 验证测试覆盖率 >= 90%
```

**测试类型**:
1. **正常输入**: 验证功能正确
2. **边界输入**: 验证边界处理
3. **无效输入**: 验证能拒绝错误输入 ⭐ 关键
4. **性能测试**: 验证约束数量合理

---

### 5. 审查阶段

```
☐ 自检清单（7 项）
☐ 提交 PR
☐ 至少 2 人代码审查
☐ CI 自动检查
☐ 安全审查
```

---

### 6. 部署阶段

```
☐ 合并到主分支
☐ 更新文档
☐ 通知团队
☐ 监控使用情况
```

---

## 🔍 代码审查清单

### 电路逻辑审查

```
☐ 1. 输出是否依赖输入？（不能是固定值）
☐ 2. 所有约束都实现了吗？
☐ 3. 约束数量合理吗？
☐ 4. 有没有硬编码的值？
☐ 5. 逻辑是否正确？
☐ 6. 是否有安全漏洞？
☐ 7. 是否符合规范？
```

---

### 测试审查

```
☐ 1. 是否有正常输入测试？
☐ 2. 是否有边界输入测试？
☐ 3. 是否有无效输入测试？⭐ 关键
☐ 4. 测试覆盖率 >= 90%？
☐ 5. 所有测试都运行并通过？
☐ 6. 是否使用真实证明测试？（不能用 MockProver）
☐ 7. 是否有性能测试？
```

---

### 文档审查

```
☐ 1. 是否有完整的注释？
☐ 2. 是否有设计文档？
☐ 3. 是否有使用示例？
☐ 4. 是否有安全说明？
☐ 5. 是否更新了 README？
```

---

## 📊 示例：AgeVerification 完整实现

### Rust/Halo2 版本

```rust
/// 年龄验证电路
/// 
/// 功能：证明年龄在 [minAge, maxAge] 范围内，且与承诺一致
/// 
/// 输入：
/// - age: 实际年龄（私密）
/// - salt: 随机盐值（私密）
/// - ageCommitment: 年龄承诺（公开）= Poseidon(age, salt)
/// - minAge: 最小年龄（公开）
/// - maxAge: 最大年龄（公开）
/// 
/// 输出：
/// - valid: 验证结果（0 或 1，公开）
///   - 1: age 在范围内且承诺正确
///   - 0: 不满足条件
/// 
/// 约束数量：~600
/// - Poseidon 哈希：~200 约束
/// - 范围检查（age >= minAge）：~100 约束
/// - 范围检查（age <= maxAge）：~100 约束
/// - 位分解（0-255）：~200 约束
#[derive(Clone, Debug)]
pub struct AgeVerificationCircuit {
    pub age: Option<u64>,
    pub salt: Option<Fp>,
    pub age_commitment: Option<Fp>,
    pub min_age: Option<u64>,
    pub max_age: Option<u64>,
}

impl Circuit<Fp> for AgeVerificationCircuit {
    type Config = AgeVerificationConfig;
    type FloorPlanner = SimpleFloorPlanner;

    fn without_witnesses(&self) -> Self {
        Self {
            age: None,
            salt: None,
            age_commitment: None,
            min_age: None,
            max_age: None,
        }
    }

    fn configure(meta: &mut ConstraintSystem<Fp>) -> Self::Config {
        // 配置逻辑...
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<Fp>,
    ) -> Result<(), Error> {
        // ✅ 1. 加载输入
        let age = self.age.ok_or(Error::Synthesis)?;
        let salt = self.salt.ok_or(Error::Synthesis)?;
        let expected_commitment = self.age_commitment.ok_or(Error::Synthesis)?;
        let min_age = self.min_age.ok_or(Error::Synthesis)?;
        let max_age = self.max_age.ok_or(Error::Synthesis)?;
        
        // ✅ 2. 验证承诺（Poseidon 哈希）
        let computed_commitment = poseidon_hash_chip(
            &mut layouter,
            &config.poseidon_config,
            &[Fp::from(age), salt]
        )?;
        
        layouter.constrain_equal(
            computed_commitment.cell(),
            expected_commitment.cell()
        )?;
        
        // ✅ 3. 验证 age >= min_age
        let age_ge_min = is_greater_or_equal_chip(
            &mut layouter,
            &config.range_check_config,
            Fp::from(age),
            Fp::from(min_age),
            8  // 8 bits
        )?;
        
        // ✅ 4. 验证 age <= max_age
        let age_le_max = is_less_or_equal_chip(
            &mut layouter,
            &config.range_check_config,
            Fp::from(age),
            Fp::from(max_age),
            8  // 8 bits
        )?;
        
        // ✅ 5. 计算输出：valid = age_ge_min AND age_le_max
        let valid = and_gate_chip(
            &mut layouter,
            &config.boolean_config,
            age_ge_min,
            age_le_max
        )?;
        
        // ✅ 6. 公开输出
        layouter.constrain_instance(valid.cell(), config.instance, 0)?;
        
        Ok(())
    }
}

// ✅ 完整的测试
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_age_generates_real_proof() {
        let params = Params::<EqAffine>::new(12);
        
        let circuit = AgeVerificationCircuit {
            age: Some(25),
            salt: Some(Fp::from(12345)),
            age_commitment: Some(poseidon_hash(&[Fp::from(25), Fp::from(12345)])),
            min_age: Some(18),
            max_age: Some(65),
        };
        
        // ✅ 生成真实证明
        let vk = keygen_vk(&params, &circuit).unwrap();
        let pk = keygen_pk(&params, vk.clone(), &circuit).unwrap();
        
        let mut proof = vec![];
        let mut transcript = Blake2bWrite::init(&mut proof);
        let public_inputs = vec![vec![Fp::one()]]; // valid = 1
        
        create_proof(
            &params,
            &pk,
            &[circuit.clone()],
            &[&[&public_inputs[0]]],
            &mut OsRng,
            &mut transcript,
        ).unwrap();
        
        // ✅ 验证真实证明
        assert!(!proof.is_empty());
        
        let mut verifier_transcript = Blake2bRead::init(&proof[..]);
        let strategy = SingleStrategy::new(&params);
        verify_proof(
            &params,
            &vk,
            strategy,
            &[&[&public_inputs[0]]],
            &mut verifier_transcript,
        ).unwrap();
    }
    
    #[test]
    fn test_invalid_age_too_young_fails() {
        let circuit = AgeVerificationCircuit {
            age: Some(17),  // < 18
            salt: Some(Fp::from(12345)),
            age_commitment: Some(poseidon_hash(&[Fp::from(17), Fp::from(12345)])),
            min_age: Some(18),
            max_age: Some(65),
        };
        
        // ✅ 期望输出 valid = 0
        let public_inputs = vec![vec![Fp::zero()]];
        
        // 验证证明生成（应该成功，但 valid = 0）
        // ... 生成和验证逻辑
    }
    
    #[test]
    fn test_invalid_commitment_fails() {
        let circuit = AgeVerificationCircuit {
            age: Some(25),
            salt: Some(Fp::from(12345)),
            age_commitment: Some(Fp::from(99999)),  // ❌ 错误的承诺
            min_age: Some(18),
            max_age: Some(65),
        };
        
        // ✅ 期望证明生成失败或验证失败
        let params = Params::<EqAffine>::new(12);
        let result = keygen_vk(&params, &circuit);
        
        // 应该失败（约束不满足）
        assert!(result.is_err() || /* 验证失败 */);
    }
}
```

---

## 🎯 总结

### 核心禁令

1. ❌ **严禁返回固定值** - 这是欺骗行为
2. ❌ **严禁使用 MockProver**（生产环境）- 必须用真实证明
3. ❌ **严禁跳过测试** - 问题必须显现

### 核心原则

> **"零知识证明的核心是验证计算的正确性，不是欺骗验证者。"**

### 强制要求

1. ✅ 输出必须依赖输入
2. ✅ 必须包含完整的约束逻辑
3. ✅ 必须有测试验证正确性
4. ✅ 必须有失败测试
5. ✅ 必须有代码审查（至少 2 人）
6. ✅ 测试覆盖率 >= 90%
7. ✅ 使用真实证明测试

### 验证清单

```
☐ 输出是否依赖输入？
☐ 是否包含所有约束？
☐ 是否有失败测试？
☐ 是否返回固定值？（❌ 绝对禁止）
☐ 是否使用 MockProver？（❌ 生产环境禁止）
☐ 是否跳过测试？（❌ 绝对禁止）
☐ 是否有代码审查？
```

---

**文档版本**: 2.0.0  
**最后更新**: 2025-11-08  
**强制执行**: ✅  
**违规后果**: 代码审查不通过，必须立即修改

**核心精神**: **"真实验证 > 假装工作"**
