const path = require("path");
const wasm_tester = require("../../node_modules/circom_tester").wasm;

describe("AgeVerification Circuit Test", function () {
    let circuit;

    beforeAll(async () => {
        circuit = await wasm_tester(
            path.join(__dirname, "../circuits/production/age_verification_v05.circom")
        );
    });

    it("应该通过：25岁满足18岁要求", async () => {
        const input = {
            birthYear: 2000,
            currentYear: 2025,
            minAge: 18
        };
        
        const witness = await circuit.calculateWitness(input);
        await circuit.checkConstraints(witness);
        await circuit.assertOut(witness, { isValid: 1 });
    });

    it("应该失败：15岁不满足18岁要求", async () => {
        const input = {
            birthYear: 2010,
            currentYear: 2025,
            minAge: 18
        };
        
        const witness = await circuit.calculateWitness(input);
        await circuit.checkConstraints(witness);
        await circuit.assertOut(witness, { isValid: 0 });
    });

    it("应该通过：刚好18岁", async () => {
        const input = {
            birthYear: 2007,
            currentYear: 2025,
            minAge: 18
        };
        
        const witness = await circuit.calculateWitness(input);
        await circuit.checkConstraints(witness);
        await circuit.assertOut(witness, { isValid: 1 });
    });

    it("应该失败：年龄超过150岁（不合理）", async () => {
        const input = {
            birthYear: 1800,
            currentYear: 2025,
            minAge: 18
        };
        
        const witness = await circuit.calculateWitness(input);
        await circuit.checkConstraints(witness);
        await circuit.assertOut(witness, { isValid: 0 });
    });
});
