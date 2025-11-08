use halo2_proofs::{
    plonk::{keygen_pk, keygen_vk},
    poly::kzg::commitment::ParamsKZG,
};
use halo2curves::bn256::Bn256;
use rand::rngs::OsRng;
use std::fs::File;
use std::io::Write;

// 需要导入电路定义
#[path = "../src/circuit.rs"]
mod circuit;

use circuit::SquareCircuit;

fn main() {
    println!("Generating ZKP keys...");

    let k = 4;
    let params = ParamsKZG::<Bn256>::setup(k, OsRng);

    let circuit = SquareCircuit {
        x: halo2_proofs::circuit::Value::unknown(),
        y: halo2_proofs::circuit::Value::unknown(),
    };

    println!("Generating verifying key...");
    let vk = keygen_vk(&params, &circuit).expect("keygen_vk failed");

    println!("Generating proving key...");
    let pk = keygen_pk(&params, vk.clone(), &circuit).expect("keygen_pk failed");

    // 保存参数
    let mut params_file = File::create("params.bin").unwrap();
    params.write(&mut params_file).unwrap();
    println!("Params saved to params.bin");

    // 保存验证密钥
    let mut vk_file = File::create("vk.bin").unwrap();
    vk.write(&mut vk_file, halo2_proofs::SerdeFormat::RawBytes).unwrap();
    println!("Verifying key saved to vk.bin");

    println!("Key generation complete!");
}
