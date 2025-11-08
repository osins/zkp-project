// src/circuit.rs - 修复版本
use halo2_proofs::{
    circuit::{Layouter, SimpleFloorPlanner, Value},
    plonk::{Advice, Circuit, Column, ConstraintSystem, Error, Instance, Selector},
    pasta::Fp,
    poly::Rotation,
};

/// 平方电路配置
#[derive(Clone, Debug)]
pub struct SquareConfig {
    pub advice_x: Column<Advice>,
    pub advice_y: Column<Advice>,
    pub instance: Column<Instance>,
    pub selector: Selector,
}

/// 平方电路
/// 
/// 证明：已知私密值 x，公开值 y = x²
#[derive(Clone, Debug, Default)]
pub struct SquareCircuit {
    pub x: Option<Fp>,
}

impl Circuit<Fp> for SquareCircuit {
    type Config = SquareConfig;
    type FloorPlanner = SimpleFloorPlanner;

    fn without_witnesses(&self) -> Self {
        Self { x: None }
    }

    fn configure(meta: &mut ConstraintSystem<Fp>) -> Self::Config {
        let advice_x = meta.advice_column();
        let advice_y = meta.advice_column();
        let instance = meta.instance_column();
        let selector = meta.selector();
        
        // 启用相等性约束
        meta.enable_equality(advice_x);
        meta.enable_equality(advice_y);
        meta.enable_equality(instance);
        
        // 定义门约束: y = x²
        meta.create_gate("square", |meta| {
            let s = meta.query_selector(selector);
            let x = meta.query_advice(advice_x, Rotation::cur());
            let y = meta.query_advice(advice_y, Rotation::cur());
            
            // 约束: s * (y - x²) = 0
            vec![s * (y - x.clone() * x)]
        });
        
        SquareConfig {
            advice_x,
            advice_y,
            instance,
            selector,
        }
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<Fp>,
    ) -> Result<(), Error> {
        // 分配计算区域并返回 y_cell
        let y_cell = layouter.assign_region(
            || "square computation",
            |mut region| {
                // 启用选择器
                config.selector.enable(&mut region, 0)?;
                
                // 分配 x 值（使用 Value 类型处理可选值）
                let x_val = Value::known(self.x.unwrap_or(Fp::zero()));
                region.assign_advice(
                    || "assign x",
                    config.advice_x,
                    0,
                    || x_val,
                )?;
                
                // 计算 y 值
                let y_val = x_val.map(|x| x * x);
                
                // 分配 y 值
                let y_cell = region.assign_advice(
                    || "assign y",
                    config.advice_y,
                    0,
                    || y_val,
                )?;
                
                Ok(y_cell)
            },
        )?;

        // 在 region 外部约束到 instance（Halo2 v0.3 标准 API）
        layouter.constrain_instance(y_cell.cell(), config.instance, 0)?;

        Ok(())
    }
}