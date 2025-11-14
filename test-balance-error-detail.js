const path = require('path');

const wasmPath = path.join(__dirname, 'rust-prover', 'pkg');

async function testBalanceProofWithErrorDetail() {
    console.log('=== Halo2 BalanceProof 错误详情测试 ===\n');
    
    const wasmModule = await import(path.join(wasmPath, 'zkp_rust_prover.js'));
    
    console.log('✅ WASM 模块加载成功\n');
    
    // 规范化十六进制
    const normalizeHex = (hex) => {
        let cleaned = hex.toLowerCase().replace(/^0x/, '');
        if (cleaned.length % 2 !== 0) {
            cleaned = '0' + cleaned;
        }
        return '0x' + cleaned;
    };
    
    // 测试 1: 余额充足
    console.log('--- 测试 1: 余额充足 (5000 >= 1000) ---');
    try {
        const result = wasmModule.wasm_generate_balance_proof(
            BigInt(5000),
            normalizeHex('0x3039'),
            normalizeHex('0x109d2'),
            BigInt(1000)
        );
        
        console.log('✅ 证明生成成功');
        const proofData = JSON.parse(result);
        console.log('   - 承诺:', proofData.publicSignals[0]);
        console.log('   - sufficient:', proofData.publicSignals[1]);
        
        // 尝试验证
        console.log('\n   尝试验证...');
        try {
            const verified = wasmModule.wasm_verify_balance_proof(
                proofData.proof,
                proofData.publicSignals[0],
                proofData.publicSignals[1]
            );
            console.log('   验证结果:', verified ? '✅ 通过' : '❌ 失败');
        } catch (verifyError) {
            console.log('   ❌ 验证抛出异常:');
            console.log('      类型:', verifyError.constructor.name);
            console.log('      消息:', verifyError.message);
            console.log('      完整:', verifyError);
        }
    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

testBalanceProofWithErrorDetail().catch(console.error);
