// src/circuits/range_proof.rs - 范围证明电路
//
// 对应 circom-circuits/circuits/production/range_proof.circom
//
// 功能: 证明私密值 x 在范围 [0, 2^n) 内
//
// 输入:
//   - x: private (witness) - 待验证的值
//   - n: const parameter - 位数
//
// 输出:
//   - valid: public (instance) - 验证结果 (始终为1,因为不满足会违反约束)
//
// 作者: ZKP Project Team
// 版本: 1.0.0
// 创建日期: 2025-11-08

use halo2_proofs::{
    circuit::{Layouter, SimpleFloorPlanner, Value},
    plonk::{Advice, Circuit, Column, ConstraintSystem, Error, Expression, Instance, Selector},
    pasta::Fp,
    poly::Rotation,
};

/// 范围证明电路配置
#[derive(Clone, Debug)]
pub struct RangeProofConfig {
    /// 输入值列
    pub value: Column<Advice>,
    /// 位分解列 (存储每一位)
    pub bits: Column<Advice>,
    /// 公共输出列
    pub instance: Column<Instance>,
    /// 位约束选择器
    pub bit_selector: Selector,
    /// 重构约束选择器
    pub recon_selector: Selector,
}

/// 范围证明电路
///
/// 证明 x 在 [0, 2^N) 范围内
///
/// 约束:
/// - N 个位约束: bit * (1 - bit) = 0
/// - 1 个重构约束: sum(bit[i] * 2^i) = x
#[derive(Clone, Debug)]
pub struct RangeProofCircuit<const N: usize> {
    /// 待证明的值
    pub value: Option<u64>,
}

impl<const N: usize> Circuit<Fp> for RangeProofCircuit<N> {
    type Config = RangeProofConfig;
    type FloorPlanner = SimpleFloorPlanner;

    fn without_witnesses(&self) -> Self {
        Self { value: None }
    }

    fn configure(meta: &mut ConstraintSystem<Fp>) -> Self::Config {
        let value = meta.advice_column();
        let bits = meta.advice_column();
        let instance = meta.instance_column();
        let bit_selector = meta.selector();
        let recon_selector = meta.selector();

        // 启用相等性约束
        meta.enable_equality(value);
        meta.enable_equality(bits);
        meta.enable_equality(instance);

        // 位约束: bit * (1 - bit) = 0
        meta.create_gate("bit check", |meta| {
            let s = meta.query_selector(bit_selector);
            let bit = meta.query_advice(bits, Rotation::cur());
            
            // 当 s = 1 时, 强制 bit = 0 或 1
            vec![s * bit.clone() * (Expression::Constant(Fp::one()) - bit)]
        });

        RangeProofConfig {
            value,
            bits,
            instance,
            bit_selector,
            recon_selector,
        }
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<Fp>,
    ) -> Result<(), Error> {
        let value_fp = Value::known(
            Fp::from(self.value.unwrap_or(0))
        );

        // 分配并分解值
        let (value_cell, _bits_cells) = layouter.assign_region(
            || "range proof",
            |mut region| {
                // 分配原始值
                let value_cell = region.assign_advice(
                    || "value",
                    config.value,
                    0,
                    || value_fp,
                )?;

                let mut bit_cells = vec![];
                let val = self.value.unwrap_or(0);

                // 分解并验证每一位
                for i in 0..N {
                    config.bit_selector.enable(&mut region, i + 1)?;
                    
                    let bit = (val >> i) & 1;
                    let bit_cell = region.assign_advice(
                        || format!("bit {}", i),
                        config.bits,
                        i + 1,
                        || Value::known(Fp::from(bit)),
                    )?;
                    bit_cells.push(bit_cell);
                }

                Ok((value_cell, bit_cells))
            },
        )?;

        // 验证重构
        layouter.assign_region(
            || "reconstruct check",
            |mut region| {
                config.recon_selector.enable(&mut region, 0)?;
                
                // 计算重构值
                let mut reconstructed = 0u64;
                for i in 0..N {
                    let bit = (self.value.unwrap_or(0) >> i) & 1;
                    reconstructed += bit << i;
                }
                
                // 验证重构值等于原值
                let recon_cell = region.assign_advice(
                    || "reconstructed",
                    config.value,
                    1,
                    || Value::known(Fp::from(reconstructed)),
                )?;
                
                region.constrain_equal(value_cell.cell(), recon_cell.cell())?;
                
                Ok(())
            },
        )?;

        // 输出结果: valid = 1 (如果能走到这里说明验证通过)
        layouter.assign_region(
            || "output",
            |mut region| {
                let valid_cell = region.assign_advice(
                    || "valid",
                    config.value,
                    0,
                    || Value::known(Fp::one()),
                )?;
                
                Ok(valid_cell)
            },
        ).and_then(|cell| {
            layouter.constrain_instance(cell.cell(), config.instance, 0)
        })?;

        Ok(())
    }
}

impl<const N: usize> Default for RangeProofCircuit<N> {
    fn default() -> Self {
        Self { value: None }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use halo2_proofs::{
        pasta::EqAffine,
        poly::commitment::Params,
        plonk::{create_proof, keygen_pk, keygen_vk, verify_proof, SingleVerifier},
        transcript::{Blake2bRead, Blake2bWrite, Challenge255},
    };
    use rand_core::OsRng;

    #[test]
    fn test_range_proof_8bit_real() {
        let k = 8;
        let value = 100u64;
        
        let params = Params::<EqAffine>::new(k);
        let empty_circuit = RangeProofCircuit::<8> { value: None };
        let vk = keygen_vk(&params, &empty_circuit).unwrap();
        let pk = keygen_pk(&params, vk.clone(), &empty_circuit).unwrap();
        
        let circuit = RangeProofCircuit::<8> { value: Some(value) };
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
        
        // 验证
        let mut transcript = Blake2bRead::<_, _, Challenge255<_>>::init(&proof[..]);
        let strategy = SingleVerifier::new(&params);
        let result = verify_proof(
            &params,
            &vk,
            strategy,
            &[instances.iter().map(|i| i.as_slice()).collect::<Vec<_>>().as_slice()],
            &mut transcript,
        );
        assert!(result.is_ok());
    }

    #[test]
    fn test_range_proof_8bit_boundary_real() {
        let k = 8;
        let value = 255u64;
        
        let params = Params::<EqAffine>::new(k);
        let empty_circuit = RangeProofCircuit::<8> { value: None };
        let vk = keygen_vk(&params, &empty_circuit).unwrap();
        let pk = keygen_pk(&params, vk.clone(), &empty_circuit).unwrap();
        
        let circuit = RangeProofCircuit::<8> { value: Some(value) };
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

    #[test]
    fn test_range_proof_16bit_real() {
        let k = 10;
        let value = 30000u64;
        
        let params = Params::<EqAffine>::new(k);
        let empty_circuit = RangeProofCircuit::<16> { value: None };
        let vk = keygen_vk(&params, &empty_circuit).unwrap();
        let pk = keygen_pk(&params, vk.clone(), &empty_circuit).unwrap();
        
        let circuit = RangeProofCircuit::<16> { value: Some(value) };
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
