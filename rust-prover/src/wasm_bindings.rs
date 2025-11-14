// src/wasm_bindings.rs - WASM 接口绑定
//
// 为 node-sdk 提供与 Circom 一致的接口
//
// 作者: ZKP Project Team
// 版本: 2.0.0

use halo2_proofs::pasta::group::ff::PrimeField;
use halo2_proofs::{
    pasta::{EqAffine, Fp},
    plonk::{create_proof, keygen_pk, keygen_vk, verify_proof, SingleVerifier},
    poly::commitment::Params,
    transcript::{Blake2bRead, Blake2bWrite, Challenge255},
};
use rand_core::OsRng;
use wasm_bindgen::prelude::*;

use crate::circuits::age_verification_v2::AgeVerificationCircuitV2;
use crate::circuits::BalanceProofCircuit;

const BALANCE_BYTES_PREFIX: usize = 32; // balance_commitment 32 字节
const BALANCE_RESULT_BYTES: usize = 1; // sufficient 1 字节 (0x00 或 0x01)

/// 解析十六进制字符串为 Fp
fn parse_hex_to_fp(hex_str: &str) -> Result<Fp, String> {
    let hex = hex_str.trim_start_matches("0x");
    let bytes = hex::decode(hex).map_err(|e| e.to_string())?;

    if bytes.len() > 32 {
        return Err("Hex string too long".to_string());
    }

    let mut fp_bytes = [0u8; 32];
    fp_bytes[..bytes.len()].copy_from_slice(&bytes);

    Fp::from_repr(fp_bytes)
        .into_option()
        .ok_or_else(|| "Invalid field element".to_string())
}

fn parse_hex(hex_str: &str) -> Result<Vec<u8>, String> {
    let hex = hex_str.trim_start_matches("0x");
    hex::decode(hex).map_err(|e| e.to_string())
}

fn fp_to_decimal_string(fp: Fp) -> String {
    let bytes = fp.to_repr();
    let mut num = 0u64;
    for (i, &byte) in bytes.as_ref()[..8].iter().enumerate() {
        num |= (byte as u64) << (i * 8);
    }
    num.to_string()
}

fn decimal_to_fp(decimal_str: &str) -> Result<Fp, String> {
    let num: u64 = decimal_str
        .parse()
        .map_err(|e: std::num::ParseIntError| e.to_string())?;
    Ok(Fp::from(num))
}

fn fp_from_u8(value: u8) -> Fp {
    Fp::from(value as u64)
}

// ============================================================================
// Age Verification
// ============================================================================
#[wasm_bindgen]
pub fn wasm_generate_age_proof(
    age: u32,
    salt_str: &str,
    min_age: u32,
    max_age: u32,
) -> Result<String, JsValue> {
    let salt = parse_hex_to_fp(salt_str)
        .map_err(|e| JsValue::from_str(&format!("Invalid salt: {}", e)))?;

    let age_fp = Fp::from(age as u64);
    let commitment = age_fp * age_fp + salt * salt;

    let circuit = AgeVerificationCircuitV2 {
        age: Some(age as u64),
        salt: Some(salt),
        age_commitment: Some(commitment),
        min_age: Some(min_age as u64),
        max_age: Some(max_age as u64),
    };

    let k = 8;
    let params = Params::<EqAffine>::new(k);
    let empty_circuit = AgeVerificationCircuitV2::default();
    let vk = keygen_vk(&params, &empty_circuit)
        .map_err(|e| JsValue::from_str(&format!("VK generation failed: {:?}", e)))?;
    let pk = keygen_pk(&params, vk.clone(), &empty_circuit)
        .map_err(|e| JsValue::from_str(&format!("PK generation failed: {:?}", e)))?;

    let valid = if age >= min_age && age <= max_age {
        Fp::one()
    } else {
        Fp::zero()
    };

    let instances = vec![vec![commitment, valid]];

    let mut proof_bytes = vec![];
    let mut transcript = Blake2bWrite::<_, _, Challenge255<_>>::init(&mut proof_bytes);

    create_proof(
        &params,
        &pk,
        &[circuit],
        &[instances
            .iter()
            .map(|i| i.as_slice())
            .collect::<Vec<_>>()
            .as_slice()],
        &mut OsRng,
        &mut transcript,
    )
    .map_err(|e| JsValue::from_str(&format!("Proof generation failed: {:?}", e)))?;

    let result = serde_json::json!({
        "proof": format!("0x{}", hex::encode(&proof_bytes)),
        "publicSignals": [
            fp_to_decimal_string(commitment),
            fp_to_decimal_string(valid),
        ]
    });

    Ok(result.to_string())
}

#[wasm_bindgen]
pub fn wasm_verify_age_proof(
    proof_hex: &str,
    commitment_str: &str,
    valid_str: &str,
) -> Result<bool, JsValue> {
    let proof_bytes =
        parse_hex(proof_hex).map_err(|e| JsValue::from_str(&format!("Invalid proof: {}", e)))?;

    let commitment = decimal_to_fp(commitment_str)
        .map_err(|e| JsValue::from_str(&format!("Invalid commitment: {}", e)))?;
    let valid = decimal_to_fp(valid_str)
        .map_err(|e| JsValue::from_str(&format!("Invalid valid: {}", e)))?;

    let k = 8;
    let params = Params::<EqAffine>::new(k);
    let empty_circuit = AgeVerificationCircuitV2::default();
    let vk = keygen_vk(&params, &empty_circuit)
        .map_err(|e| JsValue::from_str(&format!("VK generation failed: {:?}", e)))?;

    let mut transcript = Blake2bRead::<_, _, Challenge255<_>>::init(&proof_bytes[..]);
    let strategy = SingleVerifier::new(&params);

    let instances = vec![vec![commitment, valid]];

    let result = verify_proof(
        &params,
        &vk,
        strategy,
        &[instances
            .iter()
            .map(|i| i.as_slice())
            .collect::<Vec<_>>()
            .as_slice()],
        &mut transcript,
    );

    Ok(result.is_ok())
}

// ============================================================================
// Balance Proof
// ============================================================================
#[wasm_bindgen]
pub fn wasm_generate_balance_proof(
    balance: u64,
    salt_str: &str,
    account_id_str: &str,
    required_amount: u64,
) -> Result<Vec<u8>, JsValue> {
    let salt = parse_hex_to_fp(salt_str)
        .map_err(|e| JsValue::from_str(&format!("Invalid salt: {}", e)))?;

    let account_id = parse_hex_to_fp(account_id_str)
        .map_err(|e| JsValue::from_str(&format!("Invalid account_id: {}", e)))?;

    let balance_fp = Fp::from(balance);
    let hash1 = balance_fp * balance_fp + account_id * account_id;
    let balance_commitment = hash1 * hash1 + salt * salt;

    let circuit = BalanceProofCircuit {
        balance: Some(balance),
        salt: Some(salt),
        account_id: Some(account_id),
        balance_commitment: Some(balance_commitment),
        required_amount: Some(required_amount),
    };

    let k = 10;
    let params = Params::<EqAffine>::new(k);
    let empty_circuit = BalanceProofCircuit::default();
    let vk = keygen_vk(&params, &empty_circuit)
        .map_err(|e| JsValue::from_str(&format!("VK generation failed: {:?}", e)))?;
    let pk = keygen_pk(&params, vk.clone(), &empty_circuit)
        .map_err(|e| JsValue::from_str(&format!("PK generation failed: {:?}", e)))?;

    let sufficient_byte: u8 = if balance >= required_amount { 1 } else { 0 };
    let sufficient_fp = fp_from_u8(sufficient_byte);

    let instances = vec![vec![balance_commitment, sufficient_fp]];

    let mut proof_bytes = vec![];
    let mut transcript = Blake2bWrite::<_, _, Challenge255<_>>::init(&mut proof_bytes);

    create_proof(
        &params,
        &pk,
        &[circuit],
        &[instances
            .iter()
            .map(|i| i.as_slice())
            .collect::<Vec<_>>()
            .as_slice()],
        &mut OsRng,
        &mut transcript,
    )
    .map_err(|e| JsValue::from_str(&format!("Proof generation failed: {:?}", e)))?;

    let mut result =
        Vec::with_capacity(BALANCE_BYTES_PREFIX + BALANCE_RESULT_BYTES + proof_bytes.len());
    result.extend_from_slice(&balance_commitment.to_repr());
    result.push(sufficient_byte);
    result.extend_from_slice(&proof_bytes);

    Ok(result)
}

#[wasm_bindgen]
pub fn wasm_verify_balance_proof(proof_with_prefix: &[u8]) -> Result<bool, JsValue> {
    if proof_with_prefix.len() < BALANCE_BYTES_PREFIX + BALANCE_RESULT_BYTES {
        return Err(JsValue::from_str("Proof buffer too short"));
    }

    let mut commitment_bytes = [0u8; 32];
    commitment_bytes.copy_from_slice(&proof_with_prefix[..BALANCE_BYTES_PREFIX]);
    let commitment_fp = Fp::from_repr(commitment_bytes)
        .into_option()
        .ok_or_else(|| JsValue::from_str("Invalid commitment bytes"))?;

    let sufficient_byte = proof_with_prefix[BALANCE_BYTES_PREFIX];
    if sufficient_byte > 1 {
        return Err(JsValue::from_str("Invalid sufficient byte"));
    }
    let sufficient_fp = fp_from_u8(sufficient_byte);

    let proof_bytes = &proof_with_prefix[BALANCE_BYTES_PREFIX + BALANCE_RESULT_BYTES..];

    let k = 10;
    let params = Params::<EqAffine>::new(k);
    let empty_circuit = BalanceProofCircuit::default();
    let vk = keygen_vk(&params, &empty_circuit)
        .map_err(|e| JsValue::from_str(&format!("VK generation failed: {:?}", e)))?;

    let mut transcript = Blake2bRead::<_, _, Challenge255<_>>::init(proof_bytes);
    let strategy = SingleVerifier::new(&params);

    let instances = vec![vec![commitment_fp, sufficient_fp]];

    let result = verify_proof(
        &params,
        &vk,
        strategy,
        &[instances
            .iter()
            .map(|i| i.as_slice())
            .collect::<Vec<_>>()
            .as_slice()],
        &mut transcript,
    );

    Ok(result.is_ok())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wasm_balance_proof_roundtrip() {
        let proof = wasm_generate_balance_proof(5000, "0x3039", "0x109d2", 1000).unwrap();
        assert!(wasm_verify_balance_proof(&proof).unwrap());
    }
}
