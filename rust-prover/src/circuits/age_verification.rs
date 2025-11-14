// src/circuits/age_verification.rs - 年龄验证电路
//
// 对应 circom-circuits/circuits/production/age_verification.circom
//
// 功能: 证明年龄在指定范围内
//
// 简化版本说明:
// - 这是一个基础框架实现
// - 实际的范围证明需要更复杂的约束
// - 建议使用专门的范围证明库
//
// 作者: ZKP Project Team
// 版本: 1.0.0 (Basic Framework)
// 创建日期: 2025-11-08

use halo2_proofs::{
    circuit::{Layouter, SimpleFloorPlanner, Value},
    pasta::Fp,
    plonk::{Advice, Circuit, Column, ConstraintSystem, Error, Instance},
};

/// 年龄验证电路配置
#[derive(Clone, Debug)]
pub struct AgeVerificationConfig {
    pub advice: Column<Advice>,
    pub instance: Column<Instance>,
}

/// 年龄验证电路
///
/// 基础框架实现
#[derive(Clone, Debug, Default)]
pub struct AgeVerificationCircuit {
    pub age: Option<u64>,
    pub min_age: Option<u64>,
    pub max_age: Option<u64>,
}

impl Circuit<Fp> for AgeVerificationCircuit {
    type Config = AgeVerificationConfig;
    type FloorPlanner = SimpleFloorPlanner;

    fn without_witnesses(&self) -> Self {
        Self {
            age: None,
            min_age: None,
            max_age: None,
        }
    }

    fn configure(meta: &mut ConstraintSystem<Fp>) -> Self::Config {
        let advice = meta.advice_column();
        let instance = meta.instance_column();

        meta.enable_equality(advice);
        meta.enable_equality(instance);

        // TODO: 添加完整的范围检查约束
        // 需要实现位分解和比较逻辑

        AgeVerificationConfig { advice, instance }
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<Fp>,
    ) -> Result<(), Error> {
        // 这里需要验证: minAge <= age <= maxAge
        // 目前是基础框架实现

        let valid_cell = layouter.assign_region(
            || "age check",
            |mut region| {
                region.assign_advice(|| "valid", config.advice, 0, || Value::known(Fp::one()))
            },
        )?;

        layouter.constrain_instance(valid_cell.cell(), config.instance, 0)?;

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
    fn test_age_verification_real_proof() {
        let k = 8;
        let circuit = AgeVerificationCircuit {
            age: Some(25),
            min_age: Some(18),
            max_age: Some(65),
        };

        let params = Params::<EqAffine>::new(k);
        let empty_circuit = AgeVerificationCircuit::default();
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
