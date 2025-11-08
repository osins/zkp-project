const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");

async function testCircuit() {
    console.log("🧪 Testing Circom circuit...\n");

    const buildDir = path.join(__dirname, "..", "build");
    const wasmFile = path.join(buildDir, "example_js", "example.wasm");
    const zkeyFile = path.join(buildDir, "example_final.zkey");
    const vkeyFile = path.join(buildDir, "verification_key.json");

    // 检查文件是否存在
    if (!fs.existsSync(wasmFile) || !fs.existsSync(zkeyFile)) {
        console.error("❌ Circuit files not found. Run 'npm run build' first.");
        process.exit(1);
    }

    // 准备输入
    const input = {
        a: 3,
        b: 11
    };

    console.log("📥 Input:", input);
    console.log("   Expected output: c = 33\n");

    try {
        // 1. 计算 witness
        console.log("1️⃣  Calculating witness...");
        await snarkjs.wtns.calculate(
            input,
            wasmFile,
            path.join(buildDir, "witness.wtns")
        );
        console.log("✓ Witness calculated\n");

        // 2. 生成证明
        console.log("2️⃣  Generating proof...");
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            wasmFile,
            zkeyFile
        );
        console.log("✓ Proof generated");
        console.log("   Public signals:", publicSignals);
        console.log("   Proof:", JSON.stringify(proof, null, 2).substring(0, 200) + "...\n");

        // 3. 验证证明
        console.log("3️⃣  Verifying proof...");
        const vkey = JSON.parse(fs.readFileSync(vkeyFile, "utf8"));
        const verified = await snarkjs.groth16.verify(vkey, publicSignals, proof);

        if (verified) {
            console.log("✅ Proof verified successfully!\n");
        } else {
            console.log("❌ Proof verification failed!\n");
            process.exit(1);
        }

        // 4. 生成 Solidity calldata
        console.log("4️⃣  Generating Solidity calldata...");
        const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
        console.log("   Calldata:", calldata.substring(0, 100) + "...\n");

        // 保存证明到文件
        fs.writeFileSync(
            path.join(buildDir, "proof.json"),
            JSON.stringify({ proof, publicSignals }, null, 2)
        );
        fs.writeFileSync(
            path.join(buildDir, "calldata.txt"),
            calldata
        );

        console.log("💾 Saved proof.json and calldata.txt");
        console.log("✅ All tests passed!");

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

testCircuit();
