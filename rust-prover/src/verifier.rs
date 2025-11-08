use halo2_proofs::{
    plonk::{verify_proof, VerifyingKey},
    poly::kzg::{
        commitment::{KZGCommitmentScheme, ParamsKZG},
        multiopen::VerifierSHPLONK,
        strategy::SingleStrategy,
    },
    transcript::{Blake2bRead, Challenge255, TranscriptReadBuffer},
};
use halo2curves::bn256::{Bn256, Fr as Fp, G1Affine};

pub struct Verifier {
    params: ParamsKZG<Bn256>,
    vk: VerifyingKey<G1Affine>,
}

impl Verifier {
    pub fn new(params_bytes: &[u8], vk_bytes: &[u8]) -> Self {
        let mut params_reader = std::io::Cursor::new(params_bytes);
        let params = ParamsKZG::<Bn256>::read(&mut params_reader).expect("failed to read params");

        let mut vk_reader = std::io::Cursor::new(vk_bytes);
        let vk = VerifyingKey::<G1Affine>::read(
            &mut vk_reader,
            halo2_proofs::SerdeFormat::RawBytes,
            crate::circuit::SquareConfig {
                advice: halo2_proofs::plonk::Column::from(0),
                instance: halo2_proofs::plonk::Column::from(0),
                selector: halo2_proofs::plonk::Selector(0, false),
            },
        )
        .expect("failed to read vk");

        Self { params, vk }
    }

    pub fn verify(&self, proof: &[u8], public_input: Fp) -> bool {
        let public_inputs = vec![public_input];
        let instances = &[&public_inputs[..]];

        let mut transcript = Blake2bRead::<_, G1Affine, Challenge255<_>>::init(proof);
        let strategy = SingleStrategy::new(&self.params);

        verify_proof::<
            KZGCommitmentScheme<Bn256>,
            VerifierSHPLONK<'_, Bn256>,
            Challenge255<G1Affine>,
            Blake2bRead<&[u8], G1Affine, Challenge255<G1Affine>>,
            SingleStrategy<'_, Bn256>,
        >(
            &self.params,
            &self.vk,
            strategy,
            instances,
            &mut transcript,
        )
        .is_ok()
    }
}
