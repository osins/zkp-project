// src/circuits/voting.rs - 投票电路
//
// 对应 circom-circuits/circuits/production/voting_circuit.circom
//
// 功能: 匿名投票,防止双重投票
//
// 简化版本说明:
// - 这是一个基础框架实现
// - 实际需要实现默克尔树验证和废止符生成
//
// 作者: ZKP Project Team
// 版本: 1.0.0 (Basic Framework)
// 创建日期: 2025-11-08

use halo2_proofs::{
    circuit::{Layouter, SimpleFloorPlanner, Value},
    pasta::Fp,
    plonk::{Advice, Circuit, Column, ConstraintSystem, Error, Instance},
};

#[derive(Clone, Debug)]
pub struct VotingConfig {
    pub advice: Column<Advice>,
    pub instance: Column<Instance>,
}

#[derive(Clone, Debug, Default)]
pub struct VotingCircuit {
    pub voter_secret: Option<Fp>,
    pub vote: Option<u8>, // 0 or 1
    pub merkle_root: Option<Fp>,
}

impl Circuit<Fp> for VotingCircuit {
    type Config = VotingConfig;
    type FloorPlanner = SimpleFloorPlanner;

    fn without_witnesses(&self) -> Self {
        Self {
            voter_secret: None,
            vote: None,
            merkle_root: None,
        }
    }

    fn configure(meta: &mut ConstraintSystem<Fp>) -> Self::Config {
        let advice = meta.advice_column();
        let instance = meta.instance_column();

        meta.enable_equality(advice);
        meta.enable_equality(instance);

        VotingConfig { advice, instance }
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<Fp>,
    ) -> Result<(), Error> {
        let vote_hash_cell = layouter.assign_region(
            || "voting",
            |mut region| {
                region.assign_advice(|| "vote_hash", config.advice, 0, || Value::known(Fp::one()))
            },
        )?;

        layouter.constrain_instance(vote_hash_cell.cell(), config.instance, 0)?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use halo2_proofs::{
        pasta::EqAffine,
        plonk::{create_proof, keygen_pk, keygen_vk},
        poly::commitment::Params,
        transcript::{Blake2bWrite, Challenge255},
    };
    use rand_core::OsRng;

    #[test]
    fn test_voting_real_proof() {
        let k = 8;
        let circuit = VotingCircuit {
            voter_secret: Some(Fp::from(12345)),
            vote: Some(1),
            merkle_root: Some(Fp::from(99999)),
        };

        let params = Params::<EqAffine>::new(k);
        let empty_circuit = VotingCircuit::default();
        let vk = keygen_vk(&params, &empty_circuit).unwrap();
        let pk = keygen_pk(&params, vk, &empty_circuit).unwrap();

        let mut proof = vec![];
        let mut transcript = Blake2bWrite::<_, _, Challenge255<_>>::init(&mut proof);
        let instances = vec![vec![Fp::one()]];

        create_proof(
            &params,
            &pk,
            &[circuit],
            &[instances
                .iter()
                .map(|i| i.as_slice())
                .collect::<Vec<_>>()
                .as_slice()],
            &mut OsRng,
            &mut transcript,
        )
        .unwrap();

        assert!(!proof.is_empty());
    }
}
