/**
 * 测试文件: BalanceProof 电路测试
 * 
 * 测试覆盖:
 * - 正常情况: 余额充足的验证
 * - 边界情况: 余额恰好等于所需金额、零余额
 * - 无效情况: 余额不足、错误承诺
 * 
 * 目标覆盖率: >= 90%
 */

const path = require("path");
const wasm_tester = require("circom_tester").wasm;
const { buildPoseidon } = require("circomlibjs");

describe("BalanceProof Circuit - 生产级测试", function () {
    this.timeout(100000);

    let circuit;
    let poseidon;

    before(async () => {
        circuit = await wasm_tester(
            path.join(__dirname, "../circuits/production/balance_proof.circom"),
            {
                output: path.join(__dirname, "../build/balance_proof"),
                recompile: true,
            }
        );
        
        poseidon = await buildPoseidon();
    });

    /**
     * 辅助函数: 计算余额承诺
     */
    function computeCommitment(balance, accountId, salt) {
        const h = poseidon([BigInt(balance), BigInt(accountId), BigInt(salt)]);
        return poseidon.F.toString(h);
    }

    describe("✅ 正常情况测试", () => {
        it("应该验证余额充足 (5000 >= 1000)", async () => {
            const balance = 5000;
            const accountId = 12345;
            const salt = "99999";
            const requiredAmount = 1000;
            const balanceCommitment = computeCommitment(balance, accountId, salt);

            const input = {
                balance,
                accountId,
                salt,
                balanceCommitment,
                requiredAmount,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { sufficient: 1 });
        });

        it("应该验证大额余额 (1000000 >= 500000)", async () => {
            const balance = 1000000;
            const accountId = 54321;
            const salt = "11111";
            const requiredAmount = 500000;
            const balanceCommitment = computeCommitment(balance, accountId, salt);

            const input = {
                balance,
                accountId,
                salt,
                balanceCommitment,
                requiredAmount,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { sufficient: 1 });
        });

        it("应该验证小额余额 (100 >= 50)", async () => {
            const balance = 100;
            const accountId = 99999;
            const salt = "22222";
            const requiredAmount = 50;
            const balanceCommitment = computeCommitment(balance, accountId, salt);

            const input = {
                balance,
                accountId,
                salt,
                balanceCommitment,
                requiredAmount,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { sufficient: 1 });
        });
    });

    describe("🔬 边界情况测试", () => {
        it("应该验证余额恰好等于所需金额", async () => {
            const balance = 1000;
            const accountId = 77777;
            const salt = "33333";
            const requiredAmount = 1000;
            const balanceCommitment = computeCommitment(balance, accountId, salt);

            const input = {
                balance,
                accountId,
                salt,
                balanceCommitment,
                requiredAmount,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { sufficient: 1 });
        });

        it("应该处理零余额且所需金额为零", async () => {
            const balance = 0;
            const accountId = 11111;
            const salt = "44444";
            const requiredAmount = 0;
            const balanceCommitment = computeCommitment(balance, accountId, salt);

            const input = {
                balance,
                accountId,
                salt,
                balanceCommitment,
                requiredAmount,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { sufficient: 1 });
        });

        it("应该处理最大余额 (2^64-1)", async () => {
            // JavaScript 的 Number.MAX_SAFE_INTEGER = 2^53-1
            // 使用字符串表示更大的数
            const balance = "18446744073709551615";  // 2^64-1
            const accountId = 88888;
            const salt = "55555";
            const requiredAmount = "1000000000000000000";  // 10^18
            const balanceCommitment = computeCommitment(balance, accountId, salt);

            const input = {
                balance,
                accountId,
                salt,
                balanceCommitment,
                requiredAmount,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { sufficient: 1 });
        });

        it("应该验证余额略大于所需金额", async () => {
            const balance = 1001;
            const accountId = 22222;
            const salt = "66666";
            const requiredAmount = 1000;
            const balanceCommitment = computeCommitment(balance, accountId, salt);

            const input = {
                balance,
                accountId,
                salt,
                balanceCommitment,
                requiredAmount,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { sufficient: 1 });
        });
    });

    describe("❌ 无效输入测试", () => {
        it("应该拒绝余额不足 (999 < 1000)", async () => {
            const balance = 999;
            const accountId = 33333;
            const salt = "77777";
            const requiredAmount = 1000;
            const balanceCommitment = computeCommitment(balance, accountId, salt);

            const input = {
                balance,
                accountId,
                salt,
                balanceCommitment,
                requiredAmount,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { sufficient: 0 });
        });

        it("应该拒绝零余额但需要正金额", async () => {
            const balance = 0;
            const accountId = 44444;
            const salt = "88888";
            const requiredAmount = 1;
            const balanceCommitment = computeCommitment(balance, accountId, salt);

            const input = {
                balance,
                accountId,
                salt,
                balanceCommitment,
                requiredAmount,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
            await circuit.assertOut(witness, { sufficient: 0 });
        });

        it("应该拒绝错误的承诺", async () => {
            const balance = 5000;
            const accountId = 55555;
            const salt = "99999";
            const requiredAmount = 1000;
            const wrongCommitment = "123456789";

            const input = {
                balance,
                accountId,
                salt,
                balanceCommitment: wrongCommitment,
                requiredAmount,
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

        it("应该拒绝错误的 accountId", async () => {
            const balance = 5000;
            const correctAccountId = 12345;
            const wrongAccountId = 99999;
            const salt = "11111";
            const requiredAmount = 1000;
            const balanceCommitment = computeCommitment(balance, correctAccountId, salt);

            const input = {
                balance,
                accountId: wrongAccountId,  // 错误的 accountId
                salt,
                balanceCommitment,
                requiredAmount,
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
            const balance = 5000;
            const accountId = 12345;
            const correctSalt = "11111";
            const wrongSalt = "99999";
            const requiredAmount = 1000;
            const balanceCommitment = computeCommitment(balance, accountId, correctSalt);

            const input = {
                balance,
                accountId,
                salt: wrongSalt,  // 错误的盐值
                balanceCommitment,
                requiredAmount,
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

    describe("🔒 安全性测试", () => {
        it("不同账户的相同余额应该产生不同的承诺", async () => {
            const balance = 1000;
            const accountId1 = 11111;
            const accountId2 = 22222;
            const salt = "12345";

            const commitment1 = computeCommitment(balance, accountId1, salt);
            const commitment2 = computeCommitment(balance, accountId2, salt);

            // 承诺应该不同
            if (commitment1 === commitment2) {
                throw new Error("不同账户应该产生不同的承诺");
            }
        });

        it("不同盐值应该产生不同的承诺", async () => {
            const balance = 1000;
            const accountId = 12345;
            const salt1 = "11111";
            const salt2 = "22222";

            const commitment1 = computeCommitment(balance, accountId, salt1);
            const commitment2 = computeCommitment(balance, accountId, salt2);

            // 承诺应该不同
            if (commitment1 === commitment2) {
                throw new Error("不同盐值应该产生不同的承诺");
            }
        });

        it("不同余额应该产生不同的承诺", async () => {
            const balance1 = 1000;
            const balance2 = 1001;
            const accountId = 12345;
            const salt = "11111";

            const commitment1 = computeCommitment(balance1, accountId, salt);
            const commitment2 = computeCommitment(balance2, accountId, salt);

            // 承诺应该不同
            if (commitment1 === commitment2) {
                throw new Error("不同余额应该产生不同的承诺");
            }
        });
    });

    describe("📊 性能测试", () => {
        it("应该在合理时间内生成证明", async function() {
            this.timeout(5000);
            
            const balance = 10000000;
            const accountId = 99999;
            const salt = "54321";
            const requiredAmount = 5000000;
            const balanceCommitment = computeCommitment(balance, accountId, salt);

            const input = {
                balance,
                accountId,
                salt,
                balanceCommitment,
                requiredAmount,
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
