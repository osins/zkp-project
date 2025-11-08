use halo2_proofs::{
    arithmetic::Field,
    circuit::{AssignedCell, Layouter, SimpleFloorPlanner, Value},
    plonk::{Advice, Circuit, Column, ConstraintSystem, Error, Instance, Selector},
    poly::Rotation,
};
use halo2curves::bn256::Fr as Fp;

/// 简单的平方验证电路：证明 x² = y
/// 公开输入：y
/// 私有输入：x
#[derive(Clone, Debug)]
pub struct SquareCircuit {
    pub x: Value<Fp>,
    pub y: Value<Fp>,
}

#[derive(Clone, Debug)]
pub struct SquareConfig {
    advice: Column<Advice>,
    instance: Column<Instance>,
    selector: Selector,
}

impl Circuit<Fp> for SquareCircuit {
    type Config = SquareConfig;
    type FloorPlanner = SimpleFloorPlanner;

    fn without_witnesses(&self) -> Self {
        Self {
            x: Value::unknown(),
            y: Value::unknown(),
        }
    }

    fn configure(meta: &mut ConstraintSystem<Fp>) -> Self::Config {
        let advice = meta.advice_column();
        let instance = meta.instance_column();
        let selector = meta.selector();

        meta.enable_equality(advice);
        meta.enable_equality(instance);

        // 约束：x * x = y
        meta.create_gate("square", |meta| {
            let s = meta.query_selector(selector);
            let x = meta.query_advice(advice, Rotation::cur());
            let x_squared = meta.query_advice(advice, Rotation::next());
            
            vec![s * (x.clone() * x - x_squared)]
        });

        SquareConfig {
            advice,
            instance,
            selector,
        }
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<Fp>,
    ) -> Result<(), Error> {
        let x_cell = layouter.assign_region(
            || "assign x and x²",
            |mut region| {
                config.selector.enable(&mut region, 0)?;

                let x_cell = region.assign_advice(
                    || "x",
                    config.advice,
                    0,
                    || self.x,
                )?;

                let x_squared = self.x.map(|x| x * x);
                region.assign_advice(
                    || "x²",
                    config.advice,
                    1,
                    || x_squared,
                )?;

                Ok(x_cell)
            },
        )?;

        // 约束公开输入 y
        layouter.constrain_instance(x_cell.cell(), config.instance, 0)?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use halo2_proofs::dev::MockProver;

    #[test]
    fn test_square_circuit() {
        let k = 4;
        let x = Fp::from(3);
        let y = Fp::from(9);

        let circuit = SquareCircuit {
            x: Value::known(x),
            y: Value::known(y),
        };

        let public_inputs = vec![y];
        let prover = MockProver::run(k, &circuit, vec![public_inputs]).unwrap();
        prover.assert_satisfied();
    }
}
