use halo2_proofs::{
    circuit::{Layouter, SimpleFloorPlanner, Value},
    plonk::{Advice, Circuit, Column, ConstraintSystem, Error, Selector},
    pasta::Fp,
};

#[derive(Clone, Debug)]
pub struct SquareConfig {
    pub x: Column<Advice>,
    pub y: Column<Advice>,
    pub s: Selector,
}

#[derive(Clone, Debug)]
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
        let x = meta.advice_column();
        let y = meta.advice_column();
        let s = meta.selector();
        
        // 启用列的相等性约束
        meta.enable_equality(x);
        meta.enable_equality(y);
        
        // 定义自定义门约束: y = x^2
        meta.create_gate("square", |meta| {
            let s = meta.query_selector(s);
            let x = meta.query_advice(x, halo2_proofs::poly::Rotation::cur());
            let y = meta.query_advice(y, halo2_proofs::poly::Rotation::cur());
            
            vec![s * (y - x.clone() * x)]
        });
        
        SquareConfig { x, y, s }
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<Fp>,
    ) -> Result<(), Error> {
        let x_val = self.x.unwrap_or(Fp::zero());

        layouter.assign_region(
            || "square",
            |mut region| {
                config.s.enable(&mut region, 0)?;
                region.assign_advice(|| "x", config.x, 0, || Value::known(x_val))?;
                region.assign_advice(|| "y", config.y, 0, || Value::known(x_val * x_val))?;
                Ok(())
            },
        )
    }
}
