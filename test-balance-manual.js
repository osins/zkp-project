/**
 * 手动测试 BalanceProof WASM 集成
 */

const path = require('path');
const wasmPath = path.resolve(__dirname, 'rust-prover/pkg');

async function testBalanceProof() {
    console.log('=== Halo2 BalanceProof 手动测试 ===\n');
    
    // 动态导入 WASM 模块
    const wasmModule = await import(path.join(wasmPath, 'zkp_rust_prover.js'));
    
    console.log('✅ WASM 模块加载成功');
    console.log('📋 可用函数:', Object.keys(wasmModule).filter(k => k.startsWith('wasm_')));
    
    // 规范化十六进制字符串（补齐偶数位）
    const normalizeHex = (hex) => {
        let cleaned = hex.toLowerCase().replace(/^0x/, '');
        if (cleaned.length % 2 !== 0) {
            cleaned = '0' + cleaned;
        }
        return '0x' + cleaned;
    };
    
    // 测试 1: 余额充足
    console.log('\n--- 测试 1: 余额充足 (balance >= requiredAmount) ---');
    try {
        const result = wasmModule.wasm_generate_balance_proof(
            BigInt(5000),                           // balance
            normalizeHex('0x3039'),                 // salt (12345)
            normalizeHex('0x109d2'),                // accountId (67890)
            BigInt(1000)                            // requiredAmount
        );
        
        const proofData = JSON.parse(result);
        console.log('✅ 证明生成成功');
        console.log('   证明长度:', proofData.proof.length, '字符');
        console.log('   承诺值:', proofData.publicSignals[0]);
        console.log('   sufficient:', proofData.publicSignals[1], proofData.publicSignals[1] === '1' ? '✅' : '❌');
        
        // 验证证明
        console.log('   开始验证...');
        console.log('   - 证明:', proofData.proof.substring(0, 20) + '...');
        console.log('   - 承诺:', proofData.publicSignals[0]);
        console.log('   - sufficient:', proofData.publicSignals[1]);
        
        const verified = wasmModule.wasm_verify_balance_proof(
            proofData.proof,
            proofData.publicSignals[0],
            proofData.publicSignals[1]
        );
        console.log('   验证结果:', verified ? '✅ 通过' : '❌ 失败');
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
        console.error('   错误堆栈:', error.stack);
    }
    
    // 测试 2: 余额不足
    console.log('\n--- 测试 2: 余额不足 (balance < requiredAmount) ---');
    try {
        const result = wasmModule.wasm_generate_balance_proof(
            BigInt(500),                  // balance (不足)
            normalizeHex('0x3039'),
            normalizeHex('0x109d2'),
            BigInt(1000)
        );
        
        const proofData = JSON.parse(result);
        console.log('✅ 证明生成成功');
        console.log('   sufficient:', proofData.publicSignals[1], proofData.publicSignals[1] === '0' ? '✅' : '❌');
        
        const verified = wasmModule.wasm_verify_balance_proof(
            proofData.proof,
            proofData.publicSignals[0],
            proofData.publicSignals[1]
        );
        console.log('   验证结果:', verified ? '✅ 通过' : '❌ 失败');
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
        console.error('   错误堆栈:', error.stack);
    }
    
    // 测试 3: 边界情况 (相等)
    console.log('\n--- 测试 3: 边界情况 (balance === requiredAmount) ---');
    try {
        const result = wasmModule.wasm_generate_balance_proof(
            BigInt(1000),
            normalizeHex('0x3039'),
            normalizeHex('0x109d2'),
            BigInt(1000)
        );
        
        const proofData = JSON.parse(result);
        console.log('✅ 证明生成成功');
        console.log('   sufficient:', proofData.publicSignals[1], proofData.publicSignals[1] === '1' ? '✅' : '❌');
        
        const verified = wasmModule.wasm_verify_balance_proof(
            proofData.proof,
            proofData.publicSignals[0],
            proofData.publicSignals[1]
        );
        console.log('   验证结果:', verified ? '✅ 通过' : '❌ 失败');
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
        console.error('   错误堆栈:', error.stack);
    }
    
    console.log('\n=== 测试完成 ===');
}

testBalanceProof().catch(console.error);
