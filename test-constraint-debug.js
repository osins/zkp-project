const path = require('path');

const wasmPath = path.join(__dirname, 'rust-prover', 'pkg');

async function testConstraintDebug() {
    console.log('=== 约束调试测试 ===\n');
    
    const wasmModule = await import(path.join(wasmPath, 'zkp_rust_prover.js'));
    
    const normalizeHex = (hex) => {
        let cleaned = hex.toLowerCase().replace(/^0x/, '');
        if (cleaned.length % 2 !== 0) {
            cleaned = '0' + cleaned;
        }
        return '0x' + cleaned;
    };
    
    // 测试 1: 使用正确的 sufficient 值
    console.log('测试 1: 传入正确的 sufficient (应该成功)');
    try {
        const result = wasmModule.wasm_generate_balance_proof(
            BigInt(5000),
            normalizeHex('0x3039'),
            normalizeHex('0x109d2'),
            BigInt(1000)
        );
        
        const proofData = JSON.parse(result);
        console.log('  生成成功, sufficient =', proofData.publicSignals[1]);
        
        // 尝试验证
        try {
            const verified = wasmModule.wasm_verify_balance_proof(
                proofData.proof,
                proofData.publicSignals[0],
                proofData.publicSignals[1]  // 使用生成时的 sufficient
            );
            console.log('  验证结果:', verified ? '✅ 通过' : '❌ 失败');
        } catch (e) {
            console.log('  验证异常:', e.toString());
        }
    } catch (error) {
        console.error('  生成失败:', error);
    }
    
    // 测试 2: 故意传入错误的 sufficient 值
    console.log('\n测试 2: 传入错误的 sufficient (应该失败)');
    try {
        const result = wasmModule.wasm_generate_balance_proof(
            BigInt(5000),
            normalizeHex('0x3039'),
            normalizeHex('0x109d2'),
            BigInt(1000)
        );
        
        const proofData = JSON.parse(result);
        console.log('  生成成功, 正确的 sufficient =', proofData.publicSignals[1]);
        
        // 故意使用错误的 sufficient 验证
        const wrongSufficient = proofData.publicSignals[1] === '1' ? '0' : '1';
        console.log('  尝试用错误的 sufficient =', wrongSufficient);
        
        try {
            const verified = wasmModule.wasm_verify_balance_proof(
                proofData.proof,
                proofData.publicSignals[0],
                wrongSufficient  // 故意用错误的值
            );
            console.log('  验证结果:', verified ? '✅ 通过 (不应该!)' : '❌ 失败 (符合预期)');
        } catch (e) {
            console.log('  验证异常 (符合预期):', e.toString());
        }
    } catch (error) {
        console.error('  生成失败:', error);
    }
}

testConstraintDebug().catch(console.error);
