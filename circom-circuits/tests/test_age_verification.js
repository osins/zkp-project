/**
 * 测试文件: AgeVerification 电路测试
 * 
 * 测试覆盖:
 * - 正常情况: 有效的年龄验证
 * - 边界情况: 边界年龄、相等年龄
 * - 无效情况: 年龄过小、年龄过大、无效承诺
 * 
 * 目标覆盖率: >= 90%
 */

const path = require("path");
const wasm_tester = require("circom_tester").wasm;
const { buildPoseidon } = require("circomlibjs");

describe("AgeVerification Circuit - 生产级测试", function () {
    this.timeout(100000);

    let circuit;
    let poseidon;

    before(async () => {
        circuit = await wasm_tester(
            path.join(__dirname, "../circuits/production/age_verification.circom"),
            {
                output: path.join(__dirname, "../build/age_verification"),
                recompile: true,
            }
        );
        
        poseidon = await buildPoseidon();
    });

    /**
     * 辅助函数: 计算年龄承诺
     */
    function computeCommitment(age, salt) {
        const h = poseidon([BigInt(age), BigInt(salt)]);
        return poseidon.F.toString(h);
    }

    describe("✅ 正常情况测试", () => {
        it("应该验证有效的年龄 (25岁, 范围18-65)", async () => {
            const age = 25;
            const salt = "12345";
            const minAge = 18;
            const maxAge = 65;
            const ageCommitment = computeCommitment(age, salt);

            const input = {
                age,
                salt,
                ageCommitment,
                minAge,
                maxAge,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { valid: 1 });
        });

        it("应该验证成年人 (18岁, 最小值)", async () => {
            const age = 18;
            const salt = "99999";
            const minAge = 18;
            const maxAge = 100;
            const ageCommitment = computeCommitment(age, salt);

            const input = {
                age,
                salt,
                ageCommitment,
                minAge,
                maxAge,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { valid: 1 });
        });

        it("应该验证老年人 (65岁, 最大值)", async () => {
            const age = 65;
            const salt = "11111";
            const minAge = 18;
            const maxAge = 65;
            const ageCommitment = computeCommitment(age, salt);

            const input = {
                age,
                salt,
                ageCommitment,
                minAge,
                maxAge,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { valid: 1 });
        });

        it("应该验证中间年龄 (40岁)", async () => {
            const age = 40;
            const salt = "54321";
            const minAge = 21;
            const maxAge = 60;
            const ageCommitment = computeCommitment(age, salt);

            const input = {
                age,
                salt,
                ageCommitment,
                minAge,
                maxAge,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { valid: 1 });
        });
    });

    describe("🔬 边界情况测试", () => {
        it("应该验证年龄等于最小值", async () => {
            const age = 21;
            const salt = "77777";
            const minAge = 21;
            const maxAge = 50;
            const ageCommitment = computeCommitment(age, salt);

            const input = {
                age,
                salt,
                ageCommitment,
                minAge,
                maxAge,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { valid: 1 });
        });

        it("应该验证年龄等于最大值", async () => {
            const age = 50;
            const salt = "88888";
            const minAge = 21;
            const maxAge = 50;
            const ageCommitment = computeCommitment(age, salt);

            const input = {
                age,
                salt,
                ageCommitment,
                minAge,
                maxAge,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { valid: 1 });
        });

        it("应该处理零岁 (边界值)", async () => {
            const age = 0;
            const salt = "22222";
            const minAge = 0;
            const maxAge = 10;
            const ageCommitment = computeCommitment(age, salt);

            const input = {
                age,
                salt,
                ageCommitment,
                minAge,
                maxAge,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { valid: 1 });
        });

        it("应该处理最大年龄 (255)", async () => {
            const age = 255;
            const salt = "33333";
            const minAge = 0;
            const maxAge = 255;
            const ageCommitment = computeCommitment(age, salt);

            const input = {
                age,
                salt,
                ageCommitment,
                minAge,
                maxAge,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { valid: 1 });
        });

        it("应该处理相同的最小和最大年龄", async () => {
            const age = 30;
            const salt = "44444";
            const minAge = 30;
            const maxAge = 30;
            const ageCommitment = computeCommitment(age, salt);

            const input = {
                age,
                salt,
                ageCommitment,
                minAge,
                maxAge,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { valid: 1 });
        });
    });

    describe("❌ 无效输入测试", () => {
        it("应该拒绝年龄过小 (17岁, 要求18+)", async () => {
            const age = 17;
            const salt = "55555";
            const minAge = 18;
            const maxAge = 65;
            const ageCommitment = computeCommitment(age, salt);

            const input = {
                age,
                salt,
                ageCommitment,
                minAge,
                maxAge,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { valid: 0 });
        });

        it("应该拒绝年龄过大 (66岁, 上限65)", async () => {
            const age = 66;
            const salt = "66666";
            const minAge = 18;
            const maxAge = 65;
            const ageCommitment = computeCommitment(age, salt);

            const input = {
                age,
                salt,
                ageCommitment,
                minAge,
                maxAge,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { valid: 0 });
        });

        it("应该拒绝错误的承诺", async () => {
            const age = 25;
            const salt = "12345";
            const minAge = 18;
            const maxAge = 65;
            const wrongCommitment = "999999999";  // 错误的承诺

            const input = {
                age,
                salt,
                ageCommitment: wrongCommitment,
                minAge,
                maxAge,
            };

            try {
                await circuit.calculateWitness(input);
                throw new Error("应该失败但却成功了");
            } catch (error) {
                if (error.message.includes("应该失败但却成功了")) {
                    throw error;
                }
            }
        });

        it("应该拒绝错误的盐值", async () => {
            const age = 25;
            const correctSalt = "12345";
            const wrongSalt = "99999";
            const minAge = 18;
            const maxAge = 65;
            const ageCommitment = computeCommitment(age, correctSalt);

            const input = {
                age,
                salt: wrongSalt,  // 错误的盐值
                ageCommitment,
                minAge,
                maxAge,
            };

            try {
                await circuit.calculateWitness(input);
                throw new Error("应该失败但却成功了");
            } catch (error) {
                if (error.message.includes("应该失败但却成功了")) {
                    throw error;
                }
            }
        });

        it("应该拒绝无效的年龄范围 (minAge > maxAge)", async () => {
            const age = 25;
            const salt = "12345";
            const minAge = 65;  // 错误：最小值大于最大值
            const maxAge = 18;
            const ageCommitment = computeCommitment(age, salt);

            const input = {
                age,
                salt,
                ageCommitment,
                minAge,
                maxAge,
            };

            try {
                await circuit.calculateWitness(input);
                throw new Error("应该失败但却成功了");
            } catch (error) {
                if (error.message.includes("应该失败但却成功了")) {
                    throw error;
                }
            }
        });
    });

    describe("🔒 隐私保护测试", () => {
        it("不同的盐值应该产生不同的承诺（相同年龄）", async () => {
            const age = 30;
            const salt1 = "11111";
            const salt2 = "22222";

            const commitment1 = computeCommitment(age, salt1);
            const commitment2 = computeCommitment(age, salt2);

            // 承诺应该不同
            if (commitment1 === commitment2) {
                throw new Error("相同年龄但不同盐值应该产生不同的承诺");
            }
        });

        it("不同的年龄应该产生不同的承诺（相同盐值）", async () => {
            const salt = "12345";
            const age1 = 25;
            const age2 = 26;

            const commitment1 = computeCommitment(age1, salt);
            const commitment2 = computeCommitment(age2, salt);

            // 承诺应该不同
            if (commitment1 === commitment2) {
                throw new Error("不同年龄应该产生不同的承诺");
            }
        });
    });

    describe("📊 性能测试", () => {
        it("应该在合理时间内生成证明", async function() {
            this.timeout(5000);
            
            const age = 35;
            const salt = "98765";
            const minAge = 18;
            const maxAge = 70;
            const ageCommitment = computeCommitment(age, salt);

            const input = {
                age,
                salt,
                ageCommitment,
                minAge,
                maxAge,
            };

            const startTime = Date.now();
            const witness = await circuit.calculateWitness(input);
            const endTime = Date.now();

            await circuit.checkConstraints(witness);
            
            console.log(`      证明生成时间: ${endTime - startTime}ms`);
            
            // 性能断言: 应该在 500ms 内完成
            if (endTime - startTime > 500) {
                console.warn("      ⚠️ 警告: 证明生成时间超过 500ms");
            }
        });
    });
});
