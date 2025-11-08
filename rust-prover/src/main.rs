mod circuit;
mod prover;
mod verifier;

use halo2curves::bn256::Fr as Fp;
use wasm_bindgen::prelude::*;

#[cfg(feature = "wasm")]
use console_error_panic_hook;

#[cfg(feature = "wasm")]
#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub struct WasmProver {
    prover: prover::Prover,
}

#[wasm_bindgen]
impl WasmProver {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            prover: prover::Prover::new(4),
        }
    }

    #[wasm_bindgen]
    pub fn generate_proof(&self, x: u64, y: u64) -> Vec<u8> {
        let x_fp = Fp::from(x);
        let y_fp = Fp::from(y);
        self.prover.generate_proof(x_fp, y_fp)
    }

    #[wasm_bindgen]
    pub fn export_vk(&self) -> Vec<u8> {
        self.prover.export_vk()
    }

    #[wasm_bindgen]
    pub fn export_params(&self) -> Vec<u8> {
        self.prover.export_params()
    }
}

#[wasm_bindgen]
pub fn verify_proof(params: &[u8], vk: &[u8], proof: &[u8], public_input: u64) -> bool {
    let verifier = verifier::Verifier::new(params, vk);
    let public_fp = Fp::from(public_input);
    verifier.verify(proof, public_fp)
}

#[cfg(not(target_arch = "wasm32"))]
fn main() {
    println!("ZKP Prover - Use WASM build or run scripts");
}
