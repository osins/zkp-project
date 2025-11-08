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
use rand::rngs::OsRng;

mod circuit;
use crate::circuit::SquareCircuit;

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
) -> Vec<u8> {
    let circuit = SquareCircuit { x: Some(x.into()) };
    let mut proof_bytes = vec![];
    let mut transcript = Blake2bWrite::<_, _, Challenge255<_>>::init(&mut proof_bytes);

    // 没有公共输入实例
    let instances: &[&[Fp]] = &[];

    // Halo2 0.3.x create_proof: params, pk, circuits, instances, rng, transcript
    create_proof(params, pk, &[circuit], &[instances], &mut OsRng, &mut transcript).unwrap();

    proof_bytes
}

/// 验证生产级 proof
pub fn verify_real_proof(
    proof_bytes: &[u8],
    params: &Params<EqAffine>,
    vk: &VerifyingKey<EqAffine>,
) -> bool {
    let mut transcript = Blake2bRead::<_, _, Challenge255<_>>::init(proof_bytes);
    let strategy = SingleVerifier::new(params);
    let instances: &[&[Fp]] = &[];
    // Halo2 0.3.x verify_proof: params, vk, strategy, instances, transcript
    verify_proof(params, vk, strategy, &[instances], &mut transcript).is_ok()
}

/// WASM 接口：生成 proof
#[wasm_bindgen]
pub fn wasm_generate_proof(x: u32) -> Vec<u8> {
    // 使用更大的参数 k=8，提供足够的约束空间
    let params = Params::<EqAffine>::new(8);
    let circuit = SquareCircuit { x: Some((x as u64).into()) };
    
    // 使用 expect 提供更好的错误信息
    let vk = keygen_vk(&params, &circuit).expect("生成验证密钥失败");
    let pk = keygen_pk(&params, vk.clone(), &circuit).expect("生成证明密钥失败");

    generate_real_proof(x as u64, &params, &pk)
}

/// WASM 接口：验证 proof
#[wasm_bindgen]
pub fn wasm_verify_proof(proof: &[u8]) -> bool {
    // 使用相同的参数 k=8
    let params = Params::<EqAffine>::new(8);
    let circuit = SquareCircuit { x: None };
    
    // 如果生成密钥失败，返回 false
    let vk = match keygen_vk(&params, &circuit) {
        Ok(vk) => vk,
        Err(_) => return false,
    };

    verify_real_proof(proof, &params, &vk)
}
