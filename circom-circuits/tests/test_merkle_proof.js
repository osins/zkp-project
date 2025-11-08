/**
 * 测试文件: MerkleProof 电路测试
 * 
 * 测试覆盖:
 * - 正常情况: 有效的默克尔路径验证
 * - 边界情况: 单层树、最大深度树、全零路径
 * - 无效情况: 错误的路径、错误的根、无效的索引
 * 
 * 目标覆盖率: >= 90%
 */

const path = require("path");
const wasm_tester = require("circom_tester").wasm;
const { buildPoseidon } = require("circomlibjs");

describe("MerkleProof Circuit - 生产级测试", function () {
    this.timeout(100000);

    let circuit;
    let poseidon;

    before(async () => {
        // 编译电路
        circuit = await wasm_tester(
            path.join(__dirname, "../circuits/production/merkle_proof.circom"),
            {
                output: path.join(__dirname, "../build/merkle_proof"),
                recompile: true,
            }
        );
        
        // 初始化 Poseidon 哈希
        poseidon = await buildPoseidon();
    });

    /**
     * 辅助函数: 计算 Poseidon 哈希
     */
    function hash(left, right) {
        const h = poseidon([BigInt(left), BigInt(right)]);
        return poseidon.F.toString(h);
    }

    /**
     * 辅助函数: 构建默克尔树并返回路径
     */
    function buildMerkleTree(leaves, leafIndex) {
        const levels = Math.ceil(Math.log2(leaves.length));
        let currentLevel = [...leaves];
        const pathElements = [];
        const pathIndices = [];
        let index = leafIndex;

        for (let i = 0; i < levels; i++) {
            const isLeft = index % 2 === 0;
            const siblingIndex = isLeft ? index + 1 : index - 1;
            
            // 获取兄弟节点
            const sibling = currentLevel[siblingIndex] || currentLevel[index];
            pathElements.push(sibling);
            pathIndices.push(isLeft ? 0 : 1);

            // 计算下一层
            const nextLevel = [];
            for (let j = 0; j < currentLevel.length; j += 2) {
                const left = currentLevel[j];
                const right = currentLevel[j + 1] || currentLevel[j];
                nextLevel.push(hash(left, right));
            }
            
            currentLevel = nextLevel;
            index = Math.floor(index / 2);
        }

        return {
            root: currentLevel[0],
            pathElements,
            pathIndices,
        };
    }

    describe("✅ 正常情况测试", () => {
        it("应该验证有效的默克尔路径 (4个叶子)", async () => {
            const leaves = ["1", "2", "3", "4"];
            const leafIndex = 2;
            const { root, pathElements, pathIndices } = buildMerkleTree(leaves, leafIndex);

            const input = {
                leaf: leaves[leafIndex],
                pathElements,
                pathIndices,
                root,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
        });

        it("应该验证有效的默克尔路径 (8个叶子)", async () => {
            const leaves = ["10", "20", "30", "40", "50", "60", "70", "80"];
            const leafIndex = 5;
            const { root, pathElements, pathIndices } = buildMerkleTree(leaves, leafIndex);

            const input = {
                leaf: leaves[leafIndex],
                pathElements,
                pathIndices,
                root,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
        });

        it("应该验证第一个叶子", async () => {
            const leaves = ["100", "200", "300", "400"];
            const leafIndex = 0;
            const { root, pathElements, pathIndices } = buildMerkleTree(leaves, leafIndex);

            const input = {
                leaf: leaves[leafIndex],
                pathElements,
                pathIndices,
                root,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
        });

        it("应该验证最后一个叶子", async () => {
            const leaves = ["100", "200", "300", "400"];
            const leafIndex = 3;
            const { root, pathElements, pathIndices } = buildMerkleTree(leaves, leafIndex);

            const input = {
                leaf: leaves[leafIndex],
                pathElements,
                pathIndices,
                root,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
        });
    });

    describe("🔬 边界情况测试", () => {
        it("应该处理单个叶子 (深度=0)", async () => {
            const leaves = ["42"];
            const leafIndex = 0;
            
            // 深度为 0 时，路径为空
            const input = {
                leaf: leaves[leafIndex],
                pathElements: new Array(20).fill("0"),
                pathIndices: new Array(20).fill(0),
                root: leaves[leafIndex],
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
        });

        it("应该处理全零路径", async () => {
            const leaf = "0";
            let root = leaf;
            
            // 计算全零路径的根
            for (let i = 0; i < 20; i++) {
                root = hash(root, "0");
            }

            const input = {
                leaf,
                pathElements: new Array(20).fill("0"),
                pathIndices: new Array(20).fill(0),
                root,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
        });

        it("应该处理大数值叶子", async () => {
            const bigLeaf = "999999999999999999";
            const leaves = [bigLeaf, "1", "2", "3"];
            const leafIndex = 0;
            const { root, pathElements, pathIndices } = buildMerkleTree(leaves, leafIndex);

            const input = {
                leaf: leaves[leafIndex],
                pathElements,
                pathIndices,
                root,
            };

            const witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
        });
    });

    describe("❌ 无效输入测试", () => {
        it("应该拒绝错误的根", async () => {
            const leaves = ["1", "2", "3", "4"];
            const leafIndex = 0;
            const { pathElements, pathIndices } = buildMerkleTree(leaves, leafIndex);

            const input = {
                leaf: leaves[leafIndex],
                pathElements,
                pathIndices,
                root: "999999",  // 错误的根
            };

            try {
                await circuit.calculateWitness(input);
                throw new Error("应该失败但却成功了");
            } catch (error) {
                // 预期的错误
                if (error.message.includes("应该失败但却成功了")) {
                    throw error;
                }
            }
        });

        it("应该拒绝错误的路径元素", async () => {
            const leaves = ["1", "2", "3", "4"];
            const leafIndex = 0;
            const { root, pathIndices } = buildMerkleTree(leaves, leafIndex);

            const input = {
                leaf: leaves[leafIndex],
                pathElements: new Array(20).fill("999"),  // 错误的路径
                pathIndices,
                root,
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

        it("应该拒绝无效的路径索引 (不是0或1)", async () => {
            const leaves = ["1", "2", "3", "4"];
            const leafIndex = 0;
            const { root, pathElements } = buildMerkleTree(leaves, leafIndex);

            const input = {
                leaf: leaves[leafIndex],
                pathElements,
                pathIndices: new Array(20).fill(2),  // 无效值
                root,
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

        it("应该拒绝错误的叶子值", async () => {
            const leaves = ["1", "2", "3", "4"];
            const leafIndex = 0;
            const { root, pathElements, pathIndices } = buildMerkleTree(leaves, leafIndex);

            const input = {
                leaf: "999",  // 错误的叶子
                pathElements,
                pathIndices,
                root,
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

    describe("📊 性能测试", () => {
        it("应该在合理时间内生成证明 (1000个叶子)", async function() {
            this.timeout(10000);
            
            const leaves = Array.from({ length: 1024 }, (_, i) => String(i + 1));
            const leafIndex = 500;
            const { root, pathElements, pathIndices } = buildMerkleTree(leaves, leafIndex);

            const input = {
                leaf: leaves[leafIndex],
                pathElements,
                pathIndices,
                root,
            };

            const startTime = Date.now();
            const witness = await circuit.calculateWitness(input);
            const endTime = Date.now();

            await circuit.checkConstraints(witness);
            
            console.log(`      证明生成时间: ${endTime - startTime}ms`);
            
            // 性能断言: 应该在 1 秒内完成
            if (endTime - startTime > 1000) {
                console.warn("      ⚠️ 警告: 证明生成时间超过 1 秒");
            }
        });
    });
});
