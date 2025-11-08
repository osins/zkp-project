# Rust Prover 快速开始指南

## 环境要求

- Rust 1.91.0+
- Cargo 1.91.0+

## 安装

```bash
cd rust-prover
cargo build
```

## 运行测试

```bash
# 所有测试
cargo test

# 特定电路
cargo test square
cargo test range_proof
```

## 使用示例

### 1. 使用 SquareCircuit (生产级)

```rust
use zkp_rust_prover::SquareCircuit;
use halo2_proofs::pasta::Fp;
use halo2_proofs::dev::MockProver;

let circuit = SquareCircuit { 
    x: Some(Fp::from(5)) 
};

let y = Fp::from(25); // 5^2 = 25
let prover = MockProver::run(4, &circuit, vec![vec![y]]).unwrap();
assert_eq!(prover.verify(), Ok(()));
```

### 2. 使用 RangeProofCircuit (生产级)

```rust
use zkp_rust_prover::RangeProofCircuit;

// 证明值在 [0, 256) 范围内
let circuit = RangeProofCircuit::<8> { 
    value: Some(100) 
};

let valid = Fp::one();
let prover = MockProver::run(6, &circuit, vec![vec![valid]]).unwrap();
assert_eq!(prover.verify(), Ok(()));
```

### 3. 使用 CircuitAdapter

```rust
use zkp_rust_prover::{CircuitAdapter, CircuitType};

let adapter = CircuitAdapter::new();

// 列出所有电路
for circuit_type in adapter.list_circuits() {
    let info = adapter.get_circuit_info(circuit_type);
    println!("{}: {}", info.name, info.description);
}
```

## 可用电路

| 电路 | 状态 | 说明 |
|------|------|------|
| SquareCircuit | ✅ 生产级 | 证明 y = x² |
| RangeProofCircuit | ✅ 生产级 | 范围证明 |
| AgeVerificationCircuit | 🔶 框架 | 年龄验证 |
| BalanceProofCircuit | 🔶 框架 | 余额证明 |
| MerkleProofCircuit | 🔶 框架 | 默克尔证明 |
| VotingCircuit | 🔶 框架 | 投票电路 |

## 文档

- `CIRCUIT_MAPPING.md` - 电路映射详细文档
- `STATUS.md` - 实现状态
- 代码注释 - 每个电路都有详细注释

## 测试状态

✅ 17/17 测试通过 (100%)

