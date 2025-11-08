use halo2_proofs::{
    plonk::{create_proof, keygen_pk, keygen_vk, ProvingKey, VerifyingKey},
    poly::kzg::{
        commitment::{KZGCommitmentScheme, ParamsKZG},
        multiopen::{ProverSHPLONK, VerifierSHPLONK},
        strategy::SingleStrategy,
    },
    transcript::{
        Blake2bRead, Blake2bWrite, Challenge255, TranscriptReadBuffer, TranscriptWriterBuffer,
    },
};
use halo2curves::bn256::{Bn256, Fr as Fp, G1Affine};
use rand::rngs::OsRng;
use std::io::{Read, Write};

use crate::circuit::SquareCircuit;

pub struct Prover {
    params: ParamsKZG<Bn256>,
    pk: ProvingKey<G1Affine>,
}

impl Prover {
    pub fn new(k: u32) -> Self {
        // 生成 KZG 参数
        let params = ParamsKZG::<Bn256>::setup(k, OsRng);

        // 生成电路
        let circuit = SquareCircuit {
            x: halo2_proofs::circuit::Value::unknown(),
            y: halo2_proofs::circuit::Value::unknown(),
        };

        // 生成验证密钥和证明密钥
        let vk = keygen_vk(&params, &circuit).expect("keygen_vk failed");
        let pk = keygen_pk(&params, vk, &circuit).expect("keygen_pk failed");

        Self { params, pk }
    }

    pub fn generate_proof(&self, x: Fp, y: Fp) -> Vec<u8> {
        let circuit = SquareCircuit {
            x: halo2_proofs::circuit::Value::known(x),
            y: halo2_proofs::circuit::Value::known(y),
        };

        let public_inputs = vec![y];
        let instances = &[&public_inputs[..]];

        let mut transcript = Blake2bWrite::<_, G1Affine, Challenge255<_>>::init(vec![]);

        create_proof::<
            KZGCommitmentScheme<Bn256>,
            ProverSHPLONK<'_, Bn256>,
            Challenge255<G1Affine>,
            _,
            Blake2bWrite<Vec<u8>, G1Affine, Challenge255<G1Affine>>,
            _,
        >(
            &self.params,
            &self.pk,
            &[circuit],
            instances,
            OsRng,
            &mut transcript,
        )
        .expect("proof generation failed");

        transcript.finalize()
    }

    pub fn export_vk(&self) -> Vec<u8> {
        let mut buffer = Vec::new();
        self.pk.get_vk().write(&mut buffer, halo2_proofs::SerdeFormat::RawBytes).unwrap();
        buffer
    }

    pub fn export_params(&self) -> Vec<u8> {
        let mut buffer = Vec::new();
        self.params.write(&mut buffer).unwrap();
        buffer
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_prover() {
        let prover = Prover::new(4);
        let x = Fp::from(5);
        let y = Fp::from(25);
        let proof = prover.generate_proof(x, y);
        assert!(!proof.is_empty());
    }
}
