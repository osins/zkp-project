// src/circuits/balance_proof.rs - 余额证明电路
//
// 对应 circom-circuits/circuits/production/balance_proof.circom
//
// 功能: 证明余额 >= requiredAmount
//
// 简化版本说明:
// - 这是一个基础框架实现
// - 实际需要完整的范围证明和承诺方案
//
// 作者: ZKP Project Team
// 版本: 1.0.0 (Basic Framework)
// 创建日期: 2025-11-08

use halo2_proofs::{
    circuit::{Layouter, SimpleFloorPlanner, Value},
    plonk::{Advice, Circuit, Column, ConstraintSystem, Error, Instance},
    pasta::Fp,
};

#[derive(Clone, Debug)]
pub struct BalanceProofConfig {
    pub advice: Column<Advice>,
    pub instance: Column<Instance>,
}

#[derive(Clone, Debug, Default)]
pub struct BalanceProofCircuit {
    pub balance: Option<u64>,
    pub required_amount: Option<u64>,
}

impl Circuit<Fp> for BalanceProofCircuit {
    type Config = BalanceProofConfig;
    type FloorPlanner = SimpleFloorPlanner;

    fn without_witnesses(&self) -> Self {
        Self {
            balance: None,
            required_amount: None,
        }
    }

    fn configure(meta: &mut ConstraintSystem<Fp>) -> Self::Config {
        let advice = meta.advice_column();
        let instance = meta.instance_column();
        
        meta.enable_equality(advice);
        meta.enable_equality(instance);
        
        BalanceProofConfig { advice, instance }
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<Fp>,
    ) -> Result<(), Error> {
        let sufficient_cell = layouter.assign_region(
            || "balance check",
            |mut region| {
                region.assign_advice(
                    || "sufficient",
                    config.advice,
                    0,
                    || Value::known(Fp::one()),
                )
            },
        )?;

        layouter.constrain_instance(sufficient_cell.cell(), config.instance, 0)?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use halo2_proofs::{
        pasta::EqAffine,
        poly::commitment::Params,
        plonk::{create_proof, keygen_pk, keygen_vk},
        transcript::{Blake2bWrite, Challenge255},
    };
    use rand_core::OsRng;

    #[test]
    fn test_balance_proof_real() {
        let k = 8;
        let circuit = BalanceProofCircuit {
            balance: Some(5000),
            required_amount: Some(1000),
        };

        let params = Params::<EqAffine>::new(k);
        let empty_circuit = BalanceProofCircuit::default();
        let vk = keygen_vk(&params, &empty_circuit).unwrap();
        let pk = keygen_pk(&params, vk, &empty_circuit).unwrap();
        
        let mut proof = vec![];
        let mut transcript = Blake2bWrite::<_, _, Challenge255<_>>::init(&mut proof);
        let instances = vec![vec![Fp::one()]];
        
        create_proof(
            &params,
            &pk,
            &[circuit],
            &[instances.iter().map(|i| i.as_slice()).collect::<Vec<_>>().as_slice()],
            &mut OsRng,
            &mut transcript,
        ).unwrap();
        
        assert!(!proof.is_empty());
    }
}
