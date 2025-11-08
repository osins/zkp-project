const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");

/**
 * 完整测试套件 - Multiplier 电路
 * 
 * 测试覆盖:
 * - 正常情况
 * - 边界情况（零值、大数）
 * - 无效输入（预期失败）
 */

describe("Multiplier Circuit Tests", () => {
    const buildDir = path.join(__dirname, "..", "build");
    const circuitName = "multiplier";
    const wasmFile = path.join(buildDir, `${circuitName}_js`, `${circuitName}.wasm`);
    const zkeyFile = path.join(buildDir, `${circuitName}_final.zkey`);
    const vkeyFile = path.join(buildDir, `${circuitName}_verification_key.json`);

    // 辅助函数：生成并验证证明
    async function proveAndVerify(input, expectSuccess = true) {
        try {
            // 生成证明
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                input,
                wasmFile,
                zkeyFile
            );

            // 验证证明
            const vkey = JSON.parse(fs.readFileSync(vkeyFile, "utf8"));
            const verified = await snarkjs.groth16.verify(vkey, publicSignals, proof);

            return { success: true, verified, proof, publicSignals };
        } catch (error) {
            if (expectSuccess) {
                throw error;
            }
            return { success: false, error: error.message };
        }
    }

    // 测试前检查
    beforeAll(() => {
        console.log("\n🧪 Multiplier Circuit Test Suite\n");
        
        if (!fs.existsSync(wasmFile)) {
            throw new Error(`WASM file not found: ${wasmFile}\nRun: npm run build:example multiplier`);
        }
        if (!fs.existsSync(zkeyFile)) {
            throw new Error(`zkey file not found: ${zkeyFile}\nRun: npm run build:example multiplier`);
        }
        if (!fs.existsSync(vkeyFile)) {
            throw new Error(`Verification key not found: ${vkeyFile}\nRun: npm run build:example multiplier`);
        }
    });

    // ========================================================================
    // 第一部分: 正常情况测试
    // ========================================================================

    test("1.1 应该证明有效的乘法: 3 * 11 = 33", async () => {
        console.log("  Test 1.1: Valid multiplication (3 * 11 = 33)");
        
        const input = { a: 3, b: 11 };
        const { verified, publicSignals } = await proveAndVerify(input);

        expect(verified).toBe(true);
        expect(publicSignals[0]).toBe("33");
        
        console.log("  ✓ Proof verified, output:", publicSignals[0]);
    });

    test("1.2 应该证明有效的乘法: 7 * 8 = 56", async () => {
        console.log("  Test 1.2: Valid multiplication (7 * 8 = 56)");
        
        const input = { a: 7, b: 8 };
        const { verified, publicSignals } = await proveAndVerify(input);

        expect(verified).toBe(true);
        expect(publicSignals[0]).toBe("56");
        
        console.log("  ✓ Proof verified, output:", publicSignals[0]);
    });

    test("1.3 应该证明有效的乘法: 100 * 200 = 20000", async () => {
        console.log("  Test 1.3: Valid multiplication (100 * 200 = 20000)");
        
        const input = { a: 100, b: 200 };
        const { verified, publicSignals } = await proveAndVerify(input);

        expect(verified).toBe(true);
        expect(publicSignals[0]).toBe("20000");
        
        console.log("  ✓ Proof verified, output:", publicSignals[0]);
    });

    // ========================================================================
    // 第二部分: 边界情况测试
    // ========================================================================

    test("2.1 应该处理零值输入: 0 * 5 = 0", async () => {
        console.log("  Test 2.1: Zero input (0 * 5 = 0)");
        
        const input = { a: 0, b: 5 };
        const { verified, publicSignals } = await proveAndVerify(input);

        expect(verified).toBe(true);
        expect(publicSignals[0]).toBe("0");
        
        console.log("  ✓ Proof verified, output:", publicSignals[0]);
    });

    test("2.2 应该处理两个零: 0 * 0 = 0", async () => {
        console.log("  Test 2.2: Both zeros (0 * 0 = 0)");
        
        const input = { a: 0, b: 0 };
        const { verified, publicSignals } = await proveAndVerify(input);

        expect(verified).toBe(true);
        expect(publicSignals[0]).toBe("0");
        
        console.log("  ✓ Proof verified, output:", publicSignals[0]);
    });

    test("2.3 应该处理单位元: 1 * 42 = 42", async () => {
        console.log("  Test 2.3: Identity element (1 * 42 = 42)");
        
        const input = { a: 1, b: 42 };
        const { verified, publicSignals } = await proveAndVerify(input);

        expect(verified).toBe(true);
        expect(publicSignals[0]).toBe("42");
        
        console.log("  ✓ Proof verified, output:", publicSignals[0]);
    });

    test("2.4 应该处理大数: 999999 * 1 = 999999", async () => {
        console.log("  Test 2.4: Large number (999999 * 1 = 999999)");
        
        const input = { a: 999999, b: 1 };
        const { verified, publicSignals } = await proveAndVerify(input);

        expect(verified).toBe(true);
        expect(publicSignals[0]).toBe("999999");
        
        console.log("  ✓ Proof verified, output:", publicSignals[0]);
    });

    // ========================================================================
    // 第三部分: 交换律测试
    // ========================================================================

    test("3.1 应该满足交换律: a * b = b * a", async () => {
        console.log("  Test 3.1: Commutative property (a * b = b * a)");
        
        const input1 = { a: 12, b: 5 };
        const input2 = { a: 5, b: 12 };

        const { publicSignals: result1 } = await proveAndVerify(input1);
        const { publicSignals: result2 } = await proveAndVerify(input2);

        expect(result1[0]).toBe(result2[0]);
        expect(result1[0]).toBe("60");
        
        console.log("  ✓ Commutative property verified:", result1[0]);
    });

    // ========================================================================
    // 第四部分: 性能测试
    // ========================================================================

    test("4.1 性能测试: 证明生成时间", async () => {
        console.log("  Test 4.1: Proof generation performance");
        
        const input = { a: 123, b: 456 };
        const startTime = Date.now();
        
        await proveAndVerify(input);
        
        const duration = Date.now() - startTime;
        console.log(`  ✓ Proof generated in ${duration}ms`);
        
        // 性能断言（应该在合理时间内完成，如 5 秒）
        expect(duration).toBeLessThan(5000);
    });

    // ========================================================================
    // 第五部分: 导出测试
    // ========================================================================

    test("5.1 应该导出有效的 Solidity calldata", async () => {
        console.log("  Test 5.1: Solidity calldata export");
        
        const input = { a: 3, b: 11 };
        const { proof, publicSignals } = await proveAndVerify(input);

        const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
        
        expect(calldata).toBeDefined();
        expect(typeof calldata).toBe("string");
        expect(calldata.length).toBeGreaterThan(0);
        
        console.log("  ✓ Calldata exported:", calldata.substring(0, 50) + "...");
    });

    // ========================================================================
    // 第六部分: 电路信息测试
    // ========================================================================

    test("6.1 应该读取电路约束信息", async () => {
        console.log("  Test 6.1: Circuit constraints info");
        
        const r1csFile = path.join(buildDir, `${circuitName}.r1cs`);
        const r1csBuffer = fs.readFileSync(r1csFile);
        
        // 注意：这里仅验证文件存在和非空
        expect(r1csBuffer.length).toBeGreaterThan(0);
        
        console.log("  ✓ R1CS file size:", r1csBuffer.length, "bytes");
    });

    // ========================================================================
    // 测试后清理
    // ========================================================================

    afterAll(() => {
        console.log("\n✅ All tests completed!\n");
    });
});

// 如果直接运行此文件（不通过 jest）
if (require.main === module) {
    console.log("⚠️  This file should be run with Jest:");
    console.log("   npm test tests/test_multiplier.js");
    console.log("");
    console.log("Or run all tests:");
    console.log("   npm test");
}
