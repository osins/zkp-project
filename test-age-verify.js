/**
 * 测试 AgeVerification 验证功能
 */

const path = require('path');
const wasmPath = path.resolve(__dirname, 'rust-prover/pkg');

async function test() {
    const wasmModule = await import(path.join(wasmPath, 'zkp_rust_prover.js'));
    
    console.log('=== AgeVerification 验证测试 ===\n');
    
    // 规范化十六进制
    const normalizeHex = (hex) => {
        let cleaned = hex.toLowerCase().replace(/^0x/, '');
        if (cleaned.length % 2 !== 0) cleaned = '0' + cleaned;
        return '0x' + cleaned;
    };
    
    // 生成证明
    const result = wasmModule.wasm_generate_age_proof(
        25,                          // age
        normalizeHex('0x3039'),      // salt
        18,                          // minAge
        65                           // maxAge
    );
    
    const proofData = JSON.parse(result);
    console.log('✅ 证明生成成功');
    console.log('  承诺:', proofData.publicSignals[0]);
    console.log('  valid:', proofData.publicSignals[1]);
    
    // 验证证明
    console.log('\n验证证明...');
    try {
        const verified = wasmModule.wasm_verify_age_proof(
            proofData.proof,
            proofData.publicSignals[0],
            proofData.publicSignals[1]
        );
        console.log('  结果:', verified ? '✅ 通过' : '❌ 失败');
    } catch (error) {
        console.error('  ❌ 验证出错:', error.message);
    }
}

test().catch(console.error);
