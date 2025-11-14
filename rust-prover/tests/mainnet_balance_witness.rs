//! 更贴近生产的余额证明：显式调用原生 API 并校验返回字节格式

use halo2_proofs::pasta::{EqAffine, Fp};
use halo2_proofs::plonk::{keygen_pk, keygen_vk};
use halo2_proofs::poly::commitment::Params;
use rand_core::OsRng;
use zkp_rust_prover::circuits::BalanceProofCircuit;
use zkp_rust_prover::wasm_bindings::{wasm_generate_balance_proof, wasm_verify_balance_proof};

fn parse_commitment_from_wasm(proof_bytes: &[u8]) -> Fp {
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&proof_bytes[..32]);
    Fp::from_repr(arr).unwrap()
}

#[test]
fn wasm_buffer_layout_matches_native_expectations() {
    let balance = 5_000u64;
    let required_amount = 1_000u64;

    let proof_bytes = wasm_generate_balance_proof(balance, "0x3039", "0x0109d2", required_amount)
        .expect("wasm proof generation");

    assert!(
        proof_bytes.len() > 33,
        "proof bytes should include prefix and proof data"
    );
    let sufficient_flag = proof_bytes[32];
    assert_eq!(
        sufficient_flag, 1,
        "balance satisfies required amount, flag must be 1"
    );

    let commitment = parse_commitment_from_wasm(&proof_bytes);

    // 使用相同参数重新生成密钥
    let params = Params::<EqAffine>::new(10);
    let empty_circuit = BalanceProofCircuit::default();
    let vk = keygen_vk(&params, &empty_circuit).expect("vk generation failed");
    let pk = keygen_pk(&params, vk.clone(), &empty_circuit).expect("pk generation failed");

    let circuit = BalanceProofCircuit {
        balance: Some(balance),
        salt: Some(Fp::from(12_345u64)),
        account_id: Some(Fp::from(67_890u64)),
        balance_commitment: Some(commitment),
        required_amount: Some(required_amount),
    };

    // 生成原生证明，验证生成的 commitment 与 WASM 前缀一致
    let mut proof_bytes_native = vec![];
    let mut transcript = halo2_proofs::transcript::Blake2bWrite::init(&mut proof_bytes_native);

    let instances = vec![vec![commitment, Fp::one()]];
    halo2_proofs::plonk::create_proof(
        &params,
        &pk,
        &[circuit],
        &[instances
            .iter()
            .map(|row| row.as_slice())
            .collect::<Vec<_>>()
            .as_slice()],
        &mut OsRng,
        &mut transcript,
    )
    .expect("native proof generation");

    assert!(halo2_proofs::plonk::verify_proof(
        &params,
        &vk,
        halo2_proofs::plonk::SingleVerifier::new(&params),
        &[instances
            .iter()
            .map(|row| row.as_slice())
            .collect::<Vec<_>>()
            .as_slice()],
        &mut halo2_proofs::transcript::Blake2bRead::init(&proof_bytes_native[..]),
    )
    .is_ok());

    // 最终确认：WASM 生成的 proof 在 WASM 验证器中可成功验证。
    assert!(wasm_verify_balance_proof(&proof_bytes).expect("wasm verification result"));
}
