// src/adapters/mod.rs - 统一的电路适配器
//
// 为所有电路提供统一的接口,对应 circom-circuits 的接口
//
// 作者: ZKP Project Team
// 版本: 1.0.0
// 创建日期: 2025-11-08

pub mod circuit_adapter;

pub use circuit_adapter::{CircuitAdapter, CircuitType, ProofResult};
