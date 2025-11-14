//! 生产环境年龄验证电路测试
//!
//! 覆盖正例（年龄在区间内通过）与反例（年龄不在区间内失败），
//! 直接调用生产 WASM 绑定，确保流程与 Node/WASM 一致。

use halo2_proofs::pasta::Fp;
use zkp_rust_prover::wasm_bindings::{wasm_generate_age_proof, wasm_verify_age_proof};

#[test]
fn age_within_range_should_pass() {
    let proof_json =
        wasm_generate_age_proof(30, "0x3039", 18, 60).expect("age proof generation failed");

    let parsed: serde_json::Value = serde_json::from_str(&proof_json).expect("valid json output");
    let proof_hex = parsed["proof"].as_str().expect("proof field present");
    let commitment = parsed["publicSignals"][0]
        .as_u64()
        .map(|value| value.to_string())
        .expect("commitment field present");
    let valid = parsed["publicSignals"][1]
        .as_u64()
        .map(|value| value.to_string())
        .expect("valid flag present");

    assert!(
        wasm_verify_age_proof(proof_hex, commitment, valid).expect("verification result"),
        "age within allowed range should verify"
    );
}

#[test]
fn age_outside_range_should_fail() {
    let proof_json =
        wasm_generate_age_proof(70, "0x3039", 18, 60).expect("age proof generation failed");
    let parsed: serde_json::Value = serde_json::from_str(&proof_json).expect("valid json output");

    let proof_hex = parsed["proof"].as_str().expect("proof field present");
    let commitment = parsed["publicSignals"][0]
        .as_u64()
        .map(|value| value.to_string())
        .expect("commitment field present");
    let valid = parsed["publicSignals"][1]
        .as_u64()
        .map(|value| value.to_string())
        .expect("valid flag present");

    // 由于年龄超出区间，valid 应为 0，验证应失败。
    assert!(
        !wasm_verify_age_proof(proof_hex, commitment, valid).expect("verification result"),
        "age outside allowed range must fail verification"
    );
}

#[test]
fn verify_rejects_invalid_commitment() {
    let proof_json =
        wasm_generate_age_proof(25, "0x3039", 18, 40).expect("age proof generation failed");
    let parsed: serde_json::Value = serde_json::from_str(&proof_json).expect("valid json output");

    let proof_hex = parsed["proof"].as_str().expect("proof field present");
    let commitment = parsed["publicSignals"][0]
        .as_u64()
        .map(|value| value.to_string())
        .expect("commitment field present");
    let valid = parsed["publicSignals"][1]
        .as_u64()
        .map(|value| value.to_string())
        .expect("valid flag present");

    // 伪造 commitment，使验证必须拒绝。
    let mut forged_commitment_fp = Fp::zero();
    forged_commitment_fp = forged_commitment_fp + Fp::one();
    let forged_commitment = forged_commitment_fp.to_string();

    assert!(
        !wasm_verify_age_proof(proof_hex, &forged_commitment, valid).expect("verification result"),
        "forged commitment must fail verification"
    );
}
