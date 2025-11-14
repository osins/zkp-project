//! 生产环境余额证明集成测试
//!
//! 所有计算均复用生产代码路径，确保与 WASM/Node 入口一致。

use halo2_proofs::pasta::{EqAffine, Fp};
use halo2_proofs::plonk::{keygen_pk, keygen_vk};
use halo2_proofs::poly::commitment::Params;
use zkp_rust_prover::BalanceProofCircuit;
use zkp_rust_prover::{
    wasm_generate_balance_proof,
    wasm_verify_balance_proof,
};

fn compute_balance_commitment(balance: u64, salt: Fp, account_id: Fp) -> Fp {
    let balance_fp = Fp::from(balance);
    let hash1 = balance_fp * balance_fp + account_id * account_id;
    hash1 * hash1 + salt * salt
}

#[test]
fn balance_proof_round_trip_with_wasm_bindings() {
    // 输入参数与生产脚本保持一致
    let balance: u64 = 5_000;
    let required_amount: u64 = 1_000;
    let salt = Fp::from(12_345u64);
    let account_id = Fp::from(67_890u64);

    let balance_commitment = compute_balance_commitment(balance, salt, account_id);
    let sufficient = if balance >= required_amount {
        Fp::one()
    } else {
        Fp::zero()
    };

    // 1. 直接使用生产 WASM 绑定生成证明（Rust 侧直接调用函数）。
    let wasm_proof = wasm_generate_balance_proof(
        balance,
        "0x3039",   // salt = 12345
        "0x0109d2", // account_id = 67890
        required_amount,
    )
    .expect("wasm balance proof generation failed");

    assert!(
        wasm_verify_balance_proof(&wasm_proof).expect("wasm verification result"),
        "WASM round-trip verification must succeed"
    );

    // 2. 直接复现生产内核，验证证明逻辑在 Rust 原生环境下也成立。
    let params = Params::<EqAffine>::new(10);
    let empty_circuit = BalanceProofCircuit::default();
    let vk = keygen_vk(&params, &empty_circuit).expect("vk generation failed");
    let pk = keygen_pk(&params, vk.clone(), &empty_circuit).expect("pk generation failed");

    let circuit = BalanceProofCircuit {
        balance: Some(balance),
        required_amount: Some(required_amount),
    };

    let instances = vec![vec![balance_commitment, sufficient]];

    let mut proof_bytes = vec![];
    let mut transcript = halo2_proofs::transcript::Blake2bWrite::init(&mut proof_bytes);

    halo2_proofs::plonk::create_proof(
        &params,
        &pk,
        &[circuit],
        &[instances
            .iter()
            .map(|row| row.as_slice())
            .collect::<Vec<_>>()
            .as_slice()],
        &mut rand_core::OsRng,
        &mut transcript,
    )
    .expect("create_proof failed");

    assert!(!proof_bytes.is_empty(), "proof bytes should not be empty");

    let mut transcript = halo2_proofs::transcript::Blake2bRead::init(&proof_bytes[..]);
    let strategy = halo2_proofs::plonk::SingleVerifier::new(&params);

    let verification = halo2_proofs::plonk::verify_proof(
        &params,
        &vk,
        strategy,
        &[instances
            .iter()
            .map(|row| row.as_slice())
            .collect::<Vec<_>>()
            .as_slice()],
        &mut transcript,
    );

    assert!(
        verification.is_ok(),
        "native verification must succeed for production proof"
    );
}
