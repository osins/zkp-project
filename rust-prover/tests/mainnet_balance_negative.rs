//! 生产环境余额证明 - 负例与边界情况
//!
//! 目标：验证生产流程在错误输入下的健壮性与必要的失败信号。

use halo2_proofs::pasta::{EqAffine, Fp};
use halo2_proofs::plonk::{keygen_vk};
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
fn insufficient_balance_should_fail_verification() {
    let balance: u64 = 400;
    let required_amount: u64 = 1_000;
    let salt = Fp::from(12_345u64);
    let account_id = Fp::from(67_890u64);
    let commitment = compute_balance_commitment(balance, salt, account_id);

    let wasm_proof = wasm_generate_balance_proof(
        balance,
        "0x3039",
        "0x0109d2",
        required_amount,
    )
    .expect("wasm balance proof generation failed");

    // 修改 sufficient 字节为 1（伪造充足余额），验证应失败。
    let mut forged_proof = wasm_proof.clone();
    let result_byte_index = 32;
    forged_proof[result_byte_index] = 1;

    assert!(
        !wasm_verify_balance_proof(&forged_proof).expect("wasm verification result"),
        "forged sufficient flag must fail verification"
    );

    assert!(
        !wasm_verify_balance_proof(&wasm_proof).expect("wasm verification result"),
        "insufficient balance must fail verification"
    );

    let params = Params::<EqAffine>::new(10);
    let empty_circuit = BalanceProofCircuit::default();
    let vk = keygen_vk(&params, &empty_circuit).expect("vk generation failed");

    let sufficient_fp = Fp::zero();
    let instances = vec![vec![commitment, sufficient_fp]];

    let mut transcript = halo2_proofs::transcript::Blake2bRead::init(&wasm_proof[33..]);
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

    assert!(verification.is_err(), "native verification must fail for insufficient balance");
}
