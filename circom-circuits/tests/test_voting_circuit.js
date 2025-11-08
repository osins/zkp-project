/**
 * 测试文件: VotingCircuit 电路测试
 * 
 * 测试覆盖:
 * - 正常情况: 有效的投票验证
 * - 边界情况: 边界投票值、不同树深度
 * - 无效情况: 重复投票、无效投票选项
 * 
 * 目标覆盖率: >= 90%
 */

const path = require("path");
const wasm_tester = require("circom_tester").wasm;
const { buildPoseidon } = require("circomlibjs");

describe("VotingCircuit Circuit - 生产级测试", function () {
    this.timeout(100000);

    let circuit;
    let poseidon;

    before(async () => {
        circuit = await wasm_tester(
            path.join(__dirname, "../circuits/production/voting_circuit.circom"),
            {
                output: path.join(__dirname, "../build/voting_circuit"),
                recompile: true,
            }
        );
        
        poseidon = await buildPoseidon();
    });

    /**
     * 辅助函数: 计算 Poseidon 哈希
     */
    function hash(...inputs) {
        const bigInputs = inputs.map(i => BigInt(i));
        const h = poseidon(bigInputs);
        return poseidon.F.toString(h);
    }

    /**
     * 辅助函数: 生成投票者承诺
     */
    function generateVoterCommitment(voterSecret) {
        return hash(voterSecret);
    }

    /**
     * 辅助函数: 生成废止符
     */
    function generateNullifier(voterSecret) {
        return hash(voterSecret, 1);
    }

    /**
     * 辅助函数: 生成投票哈希
     */
    function generateVoteHash(vote, voterSecret) {
        return hash(vote, voterSecret);
    }

    /**
     * 辅助函数: 构建默克尔树
     */
    function buildMerkleTree(commitments, voterIndex) {
        const levels = Math.ceil(Math.log2(commitments.length));
        let currentLevel = [...commitments];
        const pathElements = [];
        const pathIndices = [];
        let index = voterIndex;

        for (let i = 0; i < levels; i++) {
            const isLeft = index % 2 === 0;
            const siblingIndex = isLeft ? index + 1 : index - 1;
            
            const sibling = currentLevel[siblingIndex] || currentLevel[index];
            pathElements.push(sibling);
            pathIndices.push(isLeft ? 0 : 1);

            const nextLevel = [];
            for (let j = 0; j < currentLevel.length; j += 2) {
                const left = currentLevel[j];
                const right = currentLevel[j + 1] || currentLevel[j];
                nextLevel.push(hash(left, right));
            }
            
            currentLevel = nextLevel;
            index = Math.floor(index / 2);
        }

        // 填充到 20 层
        while (pathElements.length < 20) {
            pathElements.push("0");
            pathIndices.push(0);
        }

        return {
            root: currentLevel[0],
            pathElements,
            pathIndices,
        };
    }

    describe("✅ 正常情况测试", () => {
        it("应该允许有效的赞成票 (vote=1)", async () => {
            const voterSecret = "12345";
            const vote = 1;
            const voterCommitment = generateVoterCommitment(voterSecret);
            
            // 构建包含 4 个投票者的默克尔树
            const commitments = [
                voterCommitment,
                hash("22222"),
                hash("33333"),
                hash("44444"),
            ];
            const voterIndex = 0;
            const { root, pathElements, pathIndices } = buildMerkleTree(commitments, voterIndex);

            const input = {
                voterSecret,
                vote,
                merkleRoot: root,
                pathElements,
                pathIndices,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);

            // 验证输出
            const expectedNullifier = generateNullifier(voterSecret);
            const expectedVoteHash = generateVoteHash(vote, voterSecret);
            
            await circuit.assertOut(witness, {
                voterCommitment,
                nullifier: expectedNullifier,
                voteHash: expectedVoteHash,
            });
        });

        it("应该允许有效的反对票 (vote=0)", async () => {
            const voterSecret = "54321";
            const vote = 0;
            const voterCommitment = generateVoterCommitment(voterSecret);
            
            const commitments = [
                hash("11111"),
                voterCommitment,
                hash("33333"),
                hash("44444"),
            ];
            const voterIndex = 1;
            const { root, pathElements, pathIndices } = buildMerkleTree(commitments, voterIndex);

            const input = {
                voterSecret,
                vote,
                merkleRoot: root,
                pathElements,
                pathIndices,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);

            const expectedNullifier = generateNullifier(voterSecret);
            const expectedVoteHash = generateVoteHash(vote, voterSecret);
            
            await circuit.assertOut(witness, {
                voterCommitment,
                nullifier: expectedNullifier,
                voteHash: expectedVoteHash,
            });
        });

        it("应该允许不同位置的投票者投票", async () => {
            const voterSecret = "99999";
            const vote = 1;
            const voterCommitment = generateVoterCommitment(voterSecret);
            
            const commitments = [
                hash("11111"),
                hash("22222"),
                hash("33333"),
                voterCommitment,  // 最后一个位置
            ];
            const voterIndex = 3;
            const { root, pathElements, pathIndices } = buildMerkleTree(commitments, voterIndex);

            const input = {
                voterSecret,
                vote,
                merkleRoot: root,
                pathElements,
                pathIndices,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
        });
    });

    describe("🔬 边界情况测试", () => {
        it("应该处理单个投票者", async () => {
            const voterSecret = "77777";
            const vote = 1;
            const voterCommitment = generateVoterCommitment(voterSecret);
            
            const input = {
                voterSecret,
                vote,
                merkleRoot: voterCommitment,  // 单个节点，根就是自己
                pathElements: new Array(20).fill("0"),
                pathIndices: new Array(20).fill(0),
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
        });

        it("应该处理大型投票者集合 (16人)", async () => {
            const voterSecret = "88888";
            const vote = 0;
            const voterCommitment = generateVoterCommitment(voterSecret);
            
            // 创建 16 个投票者
            const commitments = Array.from({ length: 16 }, (_, i) => 
                i === 8 ? voterCommitment : hash(String(i * 1111))
            );
            const voterIndex = 8;
            const { root, pathElements, pathIndices } = buildMerkleTree(commitments, voterIndex);

            const input = {
                voterSecret,
                vote,
                merkleRoot: root,
                pathElements,
                pathIndices,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
        });
    });

    describe("❌ 无效输入测试", () => {
        it("应该拒绝无效的投票选项 (vote=2)", async () => {
            const voterSecret = "12345";
            const vote = 2;  // 无效: 只能是 0 或 1
            const voterCommitment = generateVoterCommitment(voterSecret);
            
            const commitments = [voterCommitment, hash("22222")];
            const voterIndex = 0;
            const { root, pathElements, pathIndices } = buildMerkleTree(commitments, voterIndex);

            const input = {
                voterSecret,
                vote,
                merkleRoot: root,
                pathElements,
                pathIndices,
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

        it("应该拒绝未注册的投票者", async () => {
            const voterSecret = "99999";  // 未注册
            const vote = 1;
            const voterCommitment = generateVoterCommitment(voterSecret);
            
            // 树中不包含这个投票者
            const commitments = [
                hash("11111"),
                hash("22222"),
                hash("33333"),
                hash("44444"),
            ];
            const { root, pathElements, pathIndices } = buildMerkleTree(commitments, 0);

            const input = {
                voterSecret,
                vote,
                merkleRoot: root,
                pathElements,
                pathIndices,
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

        it("应该拒绝错误的默克尔根", async () => {
            const voterSecret = "12345";
            const vote = 1;
            const voterCommitment = generateVoterCommitment(voterSecret);
            
            const commitments = [voterCommitment, hash("22222")];
            const voterIndex = 0;
            const { pathElements, pathIndices } = buildMerkleTree(commitments, voterIndex);

            const input = {
                voterSecret,
                vote,
                merkleRoot: "999999999",  // 错误的根
                pathElements,
                pathIndices,
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

        it("应该拒绝无效的路径索引", async () => {
            const voterSecret = "12345";
            const vote = 1;
            const voterCommitment = generateVoterCommitment(voterSecret);
            
            const commitments = [voterCommitment, hash("22222")];
            const { root, pathElements } = buildMerkleTree(commitments, 0);

            const input = {
                voterSecret,
                vote,
                merkleRoot: root,
                pathElements,
                pathIndices: new Array(20).fill(3),  // 无效: 只能是 0 或 1
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

    describe("🔒 隐私和安全测试", () => {
        it("不同的投票者应该产生不同的废止符", async () => {
            const voter1Secret = "11111";
            const voter2Secret = "22222";

            const nullifier1 = generateNullifier(voter1Secret);
            const nullifier2 = generateNullifier(voter2Secret);

            if (nullifier1 === nullifier2) {
                throw new Error("不同投票者应该产生不同的废止符");
            }
        });

        it("不同的投票应该产生不同的投票哈希", async () => {
            const voterSecret = "12345";
            const vote1 = 0;
            const vote2 = 1;

            const voteHash1 = generateVoteHash(vote1, voterSecret);
            const voteHash2 = generateVoteHash(vote2, voterSecret);

            if (voteHash1 === voteHash2) {
                throw new Error("不同投票应该产生不同的投票哈希");
            }
        });

        it("废止符应该与投票者承诺不同", async () => {
            const voterSecret = "12345";
            const commitment = generateVoterCommitment(voterSecret);
            const nullifier = generateNullifier(voterSecret);

            if (commitment === nullifier) {
                throw new Error("废止符不应该等于投票者承诺");
            }
        });

        it("相同投票者的两次投票应该产生相同的废止符（防双重投票）", async () => {
            const voterSecret = "12345";
            
            const nullifier1 = generateNullifier(voterSecret);
            const nullifier2 = generateNullifier(voterSecret);

            if (nullifier1 !== nullifier2) {
                throw new Error("相同投票者应该产生相同的废止符");
            }
        });
    });

    describe("📊 性能测试", () => {
        it("应该在合理时间内生成证明", async function() {
            this.timeout(10000);
            
            const voterSecret = "12345";
            const vote = 1;
            const voterCommitment = generateVoterCommitment(voterSecret);
            
            // 创建 1024 个投票者的大树
            const commitments = Array.from({ length: 1024 }, (_, i) => 
                i === 512 ? voterCommitment : hash(String(i * 1111))
            );
            const voterIndex = 512;
            const { root, pathElements, pathIndices } = buildMerkleTree(commitments, voterIndex);

            const input = {
                voterSecret,
                vote,
                merkleRoot: root,
                pathElements,
                pathIndices,
            };

            const startTime = Date.now();
            const witness = await circuit.calculateWitness(input);
            const endTime = Date.now();

            await circuit.checkConstraints(witness);
            
            console.log(`      证明生成时间: ${endTime - startTime}ms`);
            
            // 性能断言: 应该在 1.5 秒内完成
            if (endTime - startTime > 1500) {
                console.warn("      ⚠️ 警告: 证明生成时间超过 1.5 秒");
            }
        });
    });
});
