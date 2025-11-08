// src/lib.rs
use wasm_bindgen::prelude::*;
use halo2_proofs::{
    pasta::{EqAffine, Fp},
    plonk::{
        create_proof, keygen_pk, keygen_vk, ProvingKey, VerifyingKey, verify_proof,
        SingleVerifier,
    },
    poly::commitment::Params,
    transcript::{Blake2bRead, Blake2bWrite, Challenge255},
};
use halo2_proofs::pasta::group::ff::PrimeField;
use rand_core::OsRng;

mod circuits;
mod simple_adapter;
mod adapters;

// 重新导出核心模块
pub use circuits::{
    SquareCircuit,
    AgeVerificationCircuit,
    BalanceProofCircuit,
    RangeProofCircuit,
    MerkleProofCircuit,
    VotingCircuit,
};
pub use simple_adapter::{SimpleProofSystem, SimpleValue};
pub use adapters::{CircuitAdapter, CircuitType, ProofResult};

// 为 WASM 添加 panic hook，以便更好地调试
#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

/// 生成生产级 proof
pub fn generate_real_proof(
    x: u64,
    params: &Params<EqAffine>,
    pk: &ProvingKey<EqAffine>,
) -> (Vec<u8>, Fp) {
    let x_fp: Fp = x.into();
    let y = x_fp * x_fp; // 计算公开输出 y = x²
    
    let circuit = circuits::SquareCircuit { x: Some(x_fp) };
    let mut proof_bytes = vec![];
    let mut transcript = Blake2bWrite::<_, _, Challenge255<_>>::init(&mut proof_bytes);

    // 公开输入：y = x²
    let public_inputs = vec![y];
    let instances = vec![public_inputs.as_slice()];

    // Halo2 0.3.x create_proof: params, pk, circuits, instances, rng, transcript
    create_proof(params, pk, &[circuit], &[instances.as_slice()], &mut OsRng, &mut transcript).unwrap();

    (proof_bytes, y)
}

/// 验证生产级 proof
pub fn verify_real_proof(
    proof_bytes: &[u8],
    y: Fp,
    params: &Params<EqAffine>,
    vk: &VerifyingKey<EqAffine>,
) -> bool {
    let mut transcript = Blake2bRead::<_, _, Challenge255<_>>::init(proof_bytes);
    let strategy = SingleVerifier::new(params);
    
    // 公开输入：y = x²
    let public_inputs = vec![y];
    let instances = vec![public_inputs.as_slice()];
    
    // Halo2 0.3.x verify_proof: params, vk, strategy, instances, transcript
    verify_proof(params, vk, strategy, &[instances.as_slice()], &mut transcript).is_ok()
}

/// WASM 接口：生成 proof
/// 返回格式：[y的32字节 | proof数据]
#[wasm_bindgen]
pub fn wasm_generate_proof(x: u32) -> Vec<u8> {
    // 使用更大的参数 k=8，提供足够的约束空间
    let params = Params::<EqAffine>::new(8);
    let circuit = circuits::SquareCircuit { x: Some((x as u64).into()) };
    
    // 使用 expect 提供更好的错误信息
    let vk = keygen_vk(&params, &circuit).expect("生成验证密钥失败");
    let pk = keygen_pk(&params, vk.clone(), &circuit).expect("生成证明密钥失败");

    let (proof_bytes, y) = generate_real_proof(x as u64, &params, &pk);
    
    // 将 y 值序列化为字节（32字节）
    let y_bytes = y.to_repr();
    
    // 组合 y 和 proof: [y的32字节 | proof]
    let mut result = Vec::with_capacity(32 + proof_bytes.len());
    result.extend_from_slice(&y_bytes);
    result.extend_from_slice(&proof_bytes);
    
    result
}

/// WASM 接口：验证 proof
/// 输入格式：[y的32字节 | proof数据]
#[wasm_bindgen]
pub fn wasm_verify_proof(proof_with_y: &[u8]) -> bool {
    if proof_with_y.len() < 32 {
        return false;
    }
    
    // 分离 y 和 proof
    let y_bytes: [u8; 32] = proof_with_y[0..32].try_into().unwrap();
    let proof_bytes = &proof_with_y[32..];
    
    // 反序列化 y
    let y = match Fp::from_repr(y_bytes).into() {
        Some(val) => val,
        None => return false,
    };
    
    // 使用相同的参数 k=8
    let params = Params::<EqAffine>::new(8);
    let circuit = circuits::SquareCircuit { x: None };
    
    // 如果生成密钥失败，返回 false
    let vk = match keygen_vk(&params, &circuit) {
        Ok(vk) => vk,
        Err(_) => return false,
    };

    verify_real_proof(proof_bytes, y, &params, &vk)
}
