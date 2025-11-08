const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");

async function testAgeVerification() {
    console.log("🧪 手动测试 AgeVerification 电路\n");
    
    const wasmFile = path.join(__dirname, "../age_verification_v05.wasm");
    const r1csFile = path.join(__dirname, "../age_verification_v05.r1cs");
    
    // 测试用例 1: 25岁满足18岁要求
    console.log("测试1: 25岁满足18岁要求");
    const input1 = {
        birthYear: "2000",
        currentYear: "2025",
        minAge: "18"
    };
    
    try {
        const { witness: witness1 } = await snarkjs.wtns.calculate(
            input1,
            wasmFile
        );
        console.log("✅ 证人计算成功");
        console.log("   输出:", witness1.slice(0, 5));
    } catch (e) {
        console.log("❌ 失败:", e.message);
    }
    
    // 测试用例 2: 15岁不满足18岁要求
    console.log("\n测试2: 15岁不满足18岁要求");
    const input2 = {
        birthYear: "2010",
        currentYear: "2025",
        minAge: "18"
    };
    
    try {
        const { witness: witness2 } = await snarkjs.wtns.calculate(
            input2,
            wasmFile
        );
        console.log("✅ 证人计算成功");
        console.log("   输出:", witness2.slice(0, 5));
    } catch (e) {
        console.log("❌ 失败:", e.message);
    }
    
    console.log("\n✅ 所有测试完成！");
}

testAgeVerification().catch(console.error);
