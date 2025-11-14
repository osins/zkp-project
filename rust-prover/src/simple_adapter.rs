// src/simple_adapter.rs - 简化的统一接口实现
use halo2_proofs::pasta::group::ff::PrimeField;
use halo2_proofs::{
    pasta::{EqAffine, Fp},
    plonk::{keygen_pk, keygen_vk},
    poly::commitment::Params,
};
use serde::{Deserialize, Serialize};

/// 简化的统一值类型
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum SimpleValue {
    Number(String),
    String(String),
    Boolean(bool),
}

impl SimpleValue {
    pub fn as_u64(&self) -> Option<u64> {
        match self {
            SimpleValue::Number(s) => s.parse().ok(),
            SimpleValue::String(s) => s.parse().ok(),
            _ => None,
        }
    }
}

/// 简化的证明系统实现
pub struct SimpleProofSystem;

impl SimpleProofSystem {
    pub fn new() -> Self {
        Self
    }

    /// 生成平方电路证明
    pub fn generate_square_proof(&self, x: u64) -> Result<(Vec<u8>, Fp), String> {
        // 使用默认参数 k=8
        let params = Params::<EqAffine>::new(8);

        // 创建电路（仅用于生成密钥）
        let circuit_for_setup = crate::circuits::SquareCircuit { x: None };
        let vk = keygen_vk(&params, &circuit_for_setup)
            .map_err(|e| format!("Failed to generate verification key: {:?}", e))?;
        let pk = keygen_pk(&params, vk.clone(), &circuit_for_setup)
            .map_err(|e| format!("Failed to generate proving key: {:?}", e))?;

        // 生成证明
        let (proof_bytes, y) = crate::generate_real_proof(x, &params, &pk);

        Ok((proof_bytes, y))
    }

    /// 验证平方电路证明
    pub fn verify_square_proof(&self, proof_with_y: &[u8]) -> Result<bool, String> {
        if proof_with_y.len() < 32 {
            return Ok(false);
        }

        // 分离 y 和 proof
        let y_bytes: [u8; 32] = match proof_with_y[0..32].try_into() {
            Ok(bytes) => bytes,
            Err(_) => return Ok(false),
        };
        let proof_bytes = &proof_with_y[32..];

        // 反序列化 y
        let y: Option<Fp> = Fp::from_repr(y_bytes).into();
        let y = match y {
            Some(val) => val,
            None => return Ok(false),
        };

        // 使用相同的参数 k=8
        let params = Params::<EqAffine>::new(8);
        let circuit = crate::circuits::SquareCircuit { x: None };

        // 生成验证密钥
        let vk = match keygen_vk(&params, &circuit) {
            Ok(vk) => vk,
            Err(_) => return Ok(false),
        };

        // 验证证明
        Ok(crate::verify_real_proof(proof_bytes, y, &params, &vk))
    }
}

impl Default for SimpleProofSystem {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_proof_system() {
        let proof_system = SimpleProofSystem::new();

        // 测试生成证明
        let x = 25;
        let result = proof_system.generate_square_proof(x);
        assert!(
            result.is_ok(),
            "Failed to generate proof: {:?}",
            result.err()
        );

        let (proof, y) = result.unwrap();
        assert!(!proof.is_empty());

        // 组合 y 和 proof
        let y_bytes = y.to_repr();
        let mut combined_proof = Vec::with_capacity(32 + proof.len());
        combined_proof.extend_from_slice(&y_bytes);
        combined_proof.extend_from_slice(&proof);

        // 测试验证证明
        let is_valid = proof_system.verify_square_proof(&combined_proof).unwrap();
        assert!(is_valid, "Generated proof should be valid");
    }

    #[test]
    fn test_multiple_values() {
        let proof_system = SimpleProofSystem::new();
        let test_values = vec![0, 1, 10, 100];

        for x in test_values {
            let result = proof_system.generate_square_proof(x);
            assert!(result.is_ok(), "Failed to generate proof for x={}", x);

            let (proof, y) = result.unwrap();
            let y_bytes = y.to_repr();
            let mut combined_proof = Vec::with_capacity(32 + proof.len());
            combined_proof.extend_from_slice(&y_bytes);
            combined_proof.extend_from_slice(&proof);

            let is_valid = proof_system.verify_square_proof(&combined_proof).unwrap();
            assert!(is_valid, "Proof should be valid for x={}", x);
        }
    }
}
