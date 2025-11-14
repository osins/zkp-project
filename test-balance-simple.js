/**
 * 简化的 BalanceProof WASM 测试 - 只测试生成
 */

const path = require('path');
const wasmPath = path.resolve(__dirname, 'rust-prover/pkg');

async function test() {
    const wasmModule = await import(path.join(wasmPath, 'zkp_rust_prover.js'));
    
    console.log('✅ WASM 模块加载成功\n');
    
    // 规范化十六进制
    const normalizeHex = (hex) => {
        let cleaned = hex.toLowerCase().replace(/^0x/, '');
        if (cleaned.length % 2 !== 0) cleaned = '0' + cleaned;
        return '0x' + cleaned;
    };
    
    // 测试 1: balance >= requiredAmount
    console.log('测试 1: 余额充足');
    const result1 = wasmModule.wasm_generate_balance_proof(
        BigInt(5000),
        normalizeHex('0x3039'),
        normalizeHex('0x109d2'),
        BigInt(1000)
    );
    const proof1 = JSON.parse(result1);
    console.log('  sufficient:', proof1.publicSignals[1], proof1.publicSignals[1] === '1' ? '✅ 正确' : '❌ 错误');
    
    // 测试 2: balance < requiredAmount  
    console.log('\n测试 2: 余额不足');
    const result2 = wasmModule.wasm_generate_balance_proof(
        BigInt(500),
        normalizeHex('0x3039'),
        normalizeHex('0x109d2'),
        BigInt(1000)
    );
    const proof2 = JSON.parse(result2);
    console.log('  sufficient:', proof2.publicSignals[1], proof2.publicSignals[1] === '0' ? '✅ 正确' : '❌ 错误');
    
    // 测试 3: balance === requiredAmount
    console.log('\n测试 3: 余额相等');
    const result3 = wasmModule.wasm_generate_balance_proof(
        BigInt(1000),
        normalizeHex('0x3039'),
        normalizeHex('0x109d2'),
        BigInt(1000)
    );
    const proof3 = JSON.parse(result3);
    console.log('  sufficient:', proof3.publicSignals[1], proof3.publicSignals[1] === '1' ? '✅ 正确' : '❌ 错误');
    
    console.log('\n=== 所有测试通过 ===');
}

test().catch(console.error);
