# Rust Prover (Halo2) 电路规范文档

## 📋 文档目的

本文档定义 `rust-prover` 模块中所有 Halo2 电路的设计、实现和审查标准。

## 🎯 核心原则

### 1. 生产环境电路与示例代码完全隔离

**规则**:
- `src/circuits/production/` - 仅包含生产级电路
- `src/circuits/examples/` - 仅包含学习/演示电路
- `src/circuits/tests/` - 仅包含测试辅助电路

**禁止**:
- ❌ 生产代码 import 示例目录
- ❌ 示例代码直接合并到生产
- ❌ 未标注用途的电路

### 2. 强制电路设计规范

每个 Halo2 电路**必须**包含完整的文档注释：

```rust
/// # 电路名称
///
/// ## 用途
/// [简要说明电路功能]
///
/// ## 状态
/// - ✅ 生产级 / 📚 示例 / 🔴 废弃
///
/// ## 电路参数
/// - **输入（Private）**: 
///   - `x: Fp` - [说明]
/// - **输出（Public）**: 
///   - `y: Fp` - [说明]
///
/// ## 约束
/// - **Gate**: y = x²
/// - **Equality**: advice_x, advice_y, instance 已启用
/// - **Selector**: 在行 0 启用
///
/// ## 约束数量
/// - Gates: 1
/// - Equality constraints: 1
///
/// ## 安全假设
/// - 标准 Halo2 安全假设
/// - Pasta curves 安全性
///
/// ## 使用场景
/// - [场景1]
/// - [场景2]
///
/// ## 限制
/// - [限制1]
/// - [限制2]
///
/// ## 示例
/// ```rust
/// let circuit = SquareCircuit { x: Some(5u64.into()) };
/// ```
///
/// ## 作者
/// - [作者名]
///
/// ## 审查
/// - 审查员1: [姓名]
/// - 审查员2: [姓名]
/// - 审查日期: [日期]
///
/// ## 版本历史
/// - v1.0.0 (2025-11-08): 初始版本
#[derive(Clone, Debug, Default)]
pub struct SquareCircuit {
    pub x: Option<Fp>,
}
```

### 3. 约束完整性原则

**必须遵守**:
- ✅ `configure`: 所有列必须启用 `enable_equality`
- ✅ `configure`: 所有 gate 必须有明确的约束逻辑
- ✅ `synthesize`: 所有 witness 必须通过 `Value::known()` 或 `Value::unknown()` 处理
- ✅ `synthesize`: 所有公共输出必须通过 `constrain_instance` 约束
- ✅ 禁止使用 `unwrap_or(Fp::zero())` 作为默认值（除非有充分理由）

**示例 - 正确**:
```rust
// ✅ 启用相等性约束
meta.enable_equality(advice_x);
meta.enable_equality(advice_y);
meta.enable_equality(instance);

// ✅ 完整的 gate 定义
meta.create_gate("square", |meta| {
    let s = meta.query_selector(selector);
    let x = meta.query_advice(advice_x, Rotation::cur());
    let y = meta.query_advice(advice_y, Rotation::cur());
    vec![s * (y - x.clone() * x)]
});

// ✅ 使用 Value 类型
let x_val = Value::known(self.x.unwrap_or(Fp::zero()));

// ✅ 约束到 instance
layouter.constrain_instance(y_cell.cell(), config.instance, 0)?;
```

**示例 - 错误**:
```rust
// ❌ 未启用 equality
// meta.enable_equality(advice_x);  // 遗漏！

// ❌ 空的 gate
meta.create_gate("empty", |meta| {
    vec![]  // 无约束！
});

// ❌ 直接使用 unwrap
let x_val = self.x.unwrap();  // Panic 风险！

// ❌ 未约束公共输出
// layouter.constrain_instance(...)?;  // 遗漏！
```

## 📝 电路分类标准

### 生产级电路 (Production)

**准入条件**:
1. ✅ 代码完整性
   - 所有列启用 equality
   - 所有 gate 逻辑完整
   - 所有公共输出约束到 instance
   - 使用 `Value` 类型安全处理 witness
   
2. ✅ 文档完整性
   - 符合规范的文档注释
   - 详细的使用说明
   - 安全假设文档
   
3. ✅ 测试覆盖
   - 单元测试覆盖率 >= 90%
   - `without_witnesses()` 测试
   - 边界情况测试
   
4. ✅ 审查流程
   - 至少 2 人代码审查
   - 安全审查通过
   - CI 检查通过

### 示例电路 (Examples)

**准入条件**:
1. ✅ 逻辑正确性验证
2. ✅ 基本文档（用途、输入输出）
3. ✅ 明确标注"示例"状态
4. ❌ 不要求完整安全审查

### 废弃电路 (Deprecated)

**命名规范**:
- 文件名必须以 `deprecated_` 开头
- 在文档注释中明确标注缺陷
- 添加 `#[deprecated]` 属性

## 🧪 测试要求

### 生产级电路测试

每个生产级电路必须提供：

1. **without_witnesses 测试**
   ```rust
   #[test]
   fn test_circuit_without_witnesses() {
       let circuit = SquareCircuit { x: None };
       let prover = MockProver::run(k, &circuit, vec![vec![]]).unwrap();
       // 应该能生成电路结构，但不验证具体值
   }
   ```

2. **正常情况测试**
   ```rust
   #[test]
   fn test_square_circuit_valid() {
       let x = Fp::from(5);
       let y = x * x;
       let circuit = SquareCircuit { x: Some(x) };
       let prover = MockProver::run(k, &circuit, vec![vec![y]]).unwrap();
       assert_eq!(prover.verify(), Ok(()));
   }
   ```

3. **边界情况测试**
   ```rust
   #[test]
   fn test_square_circuit_zero() {
       let x = Fp::zero();
       let y = Fp::zero();
       // ...
   }
   
   #[test]
   fn test_square_circuit_max() {
       let x = Fp::from_u128(u128::MAX);
       // ...
   }
   ```

4. **无效输入测试**
   ```rust
   #[test]
   fn test_square_circuit_invalid_public_input() {
       let x = Fp::from(5);
       let wrong_y = Fp::from(100);  // 错误的公共输入
       let circuit = SquareCircuit { x: Some(x) };
       let prover = MockProver::run(k, &circuit, vec![vec![wrong_y]]).unwrap();
       assert!(prover.verify().is_err());
   }
   ```

## 🔒 安全检查清单

### 代码级检查

- [ ] 所有 `Advice` 列启用 `enable_equality`
- [ ] 所有 `Instance` 列启用 `enable_equality`
- [ ] 所有 gate 有完整的约束逻辑
- [ ] 使用 `Value::known()` 或 `Value::unknown()`
- [ ] 所有公共输出通过 `constrain_instance` 约束
- [ ] 无 `unwrap()` 或有充分理由
- [ ] 无硬编码的 `Fp::zero()` 作为默认值（除非合理）

### 逻辑级检查

- [ ] 约束覆盖所有计算路径
- [ ] 无可绕过的约束
- [ ] Selector 正确启用
- [ ] Cell 分配顺序正确

### 测试级检查

- [ ] `without_witnesses()` 返回正确结构
- [ ] 正常情况测试通过
- [ ] 边界情况测试通过
- [ ] 无效输入测试能检测错误

## 🚫 常见错误模式

### 1. 未启用 Equality

```rust
// ❌ 错误
fn configure(meta: &mut ConstraintSystem<Fp>) -> Self::Config {
    let advice = meta.advice_column();
    let instance = meta.instance_column();
    // 遗漏: meta.enable_equality(advice);
    // 遗漏: meta.enable_equality(instance);
    // ...
}

// ✅ 正确
fn configure(meta: &mut ConstraintSystem<Fp>) -> Self::Config {
    let advice = meta.advice_column();
    let instance = meta.instance_column();
    meta.enable_equality(advice);
    meta.enable_equality(instance);
    // ...
}
```

### 2. 未约束公共输出

```rust
// ❌ 错误
fn synthesize(&self, config: Self::Config, mut layouter: impl Layouter<Fp>) -> Result<(), Error> {
    let y_cell = layouter.assign_region(/* ... */)?;
    // 遗漏: layouter.constrain_instance(y_cell.cell(), config.instance, 0)?;
    Ok(())
}

// ✅ 正确
fn synthesize(&self, config: Self::Config, mut layouter: impl Layouter<Fp>) -> Result<(), Error> {
    let y_cell = layouter.assign_region(/* ... */)?;
    layouter.constrain_instance(y_cell.cell(), config.instance, 0)?;
    Ok(())
}
```

### 3. 不安全的 Value 处理

```rust
// ❌ 错误
let x_val = self.x.unwrap();  // Panic!

// ⚠️ 不推荐
let x_val = Value::known(self.x.unwrap_or(Fp::zero()));  // 隐藏错误

// ✅ 正确（如果允许零值）
let x_val = self.x.map(Value::known).unwrap_or(Value::unknown());

// ✅ 正确（如果需要默认值且有充分理由）
let x_val = Value::known(self.x.unwrap_or(Fp::zero()));  // 需注释说明原因
```

### 4. without_witnesses 实现错误

```rust
// ❌ 错误
fn without_witnesses(&self) -> Self {
    self.clone()  // 包含了 witness！
}

// ✅ 正确
fn without_witnesses(&self) -> Self {
    Self { x: None }
}
```

## 📊 性能优化指南

### 约束数量优化

- 减少 gate 数量
- 合并相似约束
- 使用高效的 gadget

### 电路大小优化

- 选择合适的 `k` 值
- 避免不必要的列
- 复用 Selector

## 🔄 版本控制

- 电路版本号遵循 Semantic Versioning
- 重大更改必须更新主版本号
- 保持向后兼容性（或明确标注破坏性更改）

## 📞 获取帮助

- 查阅 [Halo2 Book](https://zcash.github.io/halo2/)
- 参考 [Halo2 示例](https://github.com/zcash/halo2/tree/main/halo2_proofs/examples)
- 提交 Issue 或联系团队

---

**文档版本**: 1.0.0  
**最后更新**: 2025-11-08  
**维护者**: ZKP Project Team  
**基于**: Circom-Circuits 模块规范
