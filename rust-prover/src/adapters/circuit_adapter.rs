// src/adapters/circuit_adapter.rs - 电路适配器实现
//
// 统一的证明生成和验证接口
//
// 作者: ZKP Project Team
// 版本: 1.0.0
// 创建日期: 2025-11-08

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 电路类型枚举
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CircuitType {
    /// 平方电路
    Square,
    /// 年龄验证电路
    AgeVerification,
    /// 余额证明电路
    BalanceProof,
    /// 范围证明电路
    RangeProof,
    /// 默克尔树证明电路
    MerkleProof,
    /// 投票电路
    Voting,
}

/// 证明结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProofResult {
    /// 证明数据
    pub proof: Vec<u8>,
    /// 公开输出
    pub public_outputs: HashMap<String, String>,
}

/// 电路适配器
///
/// 提供统一的接口来使用不同的电路
pub struct CircuitAdapter;

impl CircuitAdapter {
    /// 创建新的适配器实例
    pub fn new() -> Self {
        Self
    }

    /// 获取电路信息
    pub fn get_circuit_info(&self, circuit_type: CircuitType) -> CircuitInfo {
        match circuit_type {
            CircuitType::Square => CircuitInfo {
                name: "Square".to_string(),
                description: "证明知道 x 使得 y = x²".to_string(),
                inputs: vec!["x".to_string()],
                outputs: vec!["y".to_string()],
                status: "Production".to_string(),
            },
            CircuitType::AgeVerification => CircuitInfo {
                name: "AgeVerification".to_string(),
                description: "证明年龄在范围内".to_string(),
                inputs: vec!["age".to_string(), "minAge".to_string(), "maxAge".to_string()],
                outputs: vec!["valid".to_string()],
                status: "Basic Framework".to_string(),
            },
            CircuitType::BalanceProof => CircuitInfo {
                name: "BalanceProof".to_string(),
                description: "证明余额充足".to_string(),
                inputs: vec!["balance".to_string(), "requiredAmount".to_string()],
                outputs: vec!["sufficient".to_string()],
                status: "Basic Framework".to_string(),
            },
            CircuitType::RangeProof => CircuitInfo {
                name: "RangeProof".to_string(),
                description: "证明值在范围内".to_string(),
                inputs: vec!["value".to_string(), "bits".to_string()],
                outputs: vec!["valid".to_string()],
                status: "Production".to_string(),
            },
            CircuitType::MerkleProof => CircuitInfo {
                name: "MerkleProof".to_string(),
                description: "证明叶子在默克尔树中".to_string(),
                inputs: vec!["leaf".to_string(), "root".to_string()],
                outputs: vec!["root".to_string()],
                status: "Basic Framework".to_string(),
            },
            CircuitType::Voting => CircuitInfo {
                name: "Voting".to_string(),
                description: "匿名投票".to_string(),
                inputs: vec!["voterSecret".to_string(), "vote".to_string()],
                outputs: vec!["voteHash".to_string()],
                status: "Basic Framework".to_string(),
            },
        }
    }

    /// 列出所有可用的电路
    pub fn list_circuits(&self) -> Vec<CircuitType> {
        vec![
            CircuitType::Square,
            CircuitType::AgeVerification,
            CircuitType::BalanceProof,
            CircuitType::RangeProof,
            CircuitType::MerkleProof,
            CircuitType::Voting,
        ]
    }
}

impl Default for CircuitAdapter {
    fn default() -> Self {
        Self::new()
    }
}

/// 电路信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircuitInfo {
    pub name: String,
    pub description: String,
    pub inputs: Vec<String>,
    pub outputs: Vec<String>,
    pub status: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_adapter_creation() {
        let adapter = CircuitAdapter::new();
        let circuits = adapter.list_circuits();
        assert_eq!(circuits.len(), 6);
    }

    #[test]
    fn test_get_circuit_info() {
        let adapter = CircuitAdapter::new();
        let info = adapter.get_circuit_info(CircuitType::Square);
        assert_eq!(info.name, "Square");
        assert_eq!(info.status, "Production");
    }

    #[test]
    fn test_all_circuit_info() {
        let adapter = CircuitAdapter::new();
        for circuit_type in adapter.list_circuits() {
            let info = adapter.get_circuit_info(circuit_type);
            assert!(!info.name.is_empty());
            assert!(!info.description.is_empty());
        }
    }
}
