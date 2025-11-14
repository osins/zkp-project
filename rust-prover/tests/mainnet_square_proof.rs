//! 生产环境平方电路证明集成测试
//!
//! 覆盖完整生产流程：密钥生成、证明生成、验证、参数一致性校验。

use halo2_proofs::pasta::{EqAffine, Fp};
use halo2_proofs::plonk::{keygen_pk, keygen_vk};
use halo2_proofs::poly::commitment::Params;
use zkp_rust_prover::{generate_real_proof, verify_real_proof};

#[test]
fn square_proof_end_to_end() {
    // 生产环境固定参数：k 必须大于 4，使用与 WASM 一致的 k = 8。
    let params = Params::<EqAffine>::new(8);

    // 生成密钥使用无 witness 的电路实例，确保生产流程与节点侧一致。
    let circuit_without_witness = zkp_rust_prover::SquareCircuit { x: None };
    let vk =
        keygen_vk(&params, &circuit_without_witness).expect("verification key generation failed");
    let pk = keygen_pk(&params, vk.clone(), &circuit_without_witness)
        .expect("proving key generation failed");

    // 生成真实证明，使用生产函数 `generate_real_proof`，保证流程与 WASM/Node 一致。
    let witness_x = 25u64;
    let (proof_bytes, public_y) = generate_real_proof(witness_x, &params, &pk);

    assert!(!proof_bytes.is_empty(), "proof bytes must not be empty");

    // 验证真实证明，确保 `verify_real_proof` 能够在生产环境中成功验证。
    let verification_result = verify_real_proof(&proof_bytes, public_y, &params, &vk);
    assert!(
        verification_result,
        "production proof verification should succeed"
    );

    // 额外的生产级断言：公开输出必须与 witness 对应关系一致。
    let expected_y = Fp::from(witness_x) * Fp::from(witness_x);
    assert_eq!(public_y, expected_y, "public output y must equal x^2");
}
