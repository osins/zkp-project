/**
 * 使用与 Rust 测试完全相同的参数测试 BalanceProof
 */

const path = require('path');
const wasmPath = path.resolve(__dirname, 'rust-prover/pkg');

async function test() {
    const wasmModule = await import(path.join(wasmPath, 'zkp_rust_prover.js'));
    
    console.log('=== BalanceProof 精确参数测试 ===\n');
    
    // Rust 测试中的参数:
    // balance = 5000u64;
    // required_amount = 1000u64;
    // salt = Fp::from(12345u64);
    // account_id = Fp::from(67890u64);
    
    // 12345 = 0x3039
    // 67890 = 0x109d2
    
    const normalizeHex = (hex) => {
        let cleaned = hex.toLowerCase().replace(/^0x/, '');
        if (cleaned.length % 2 !== 0) cleaned = '0' + cleaned;
        return '0x' + cleaned;
    };
    
    console.log('使用参数:');
    console.log('  balance: 5000');
    console.log('  salt: 12345 (0x3039)');
    console.log('  accountId: 67890 (0x109d2)');
    console.log('  requiredAmount: 1000\n');
    
    // 生成证明
    const result = wasmModule.wasm_generate_balance_proof(
        BigInt(5000),
        normalizeHex('0x3039'),
        normalizeHex('0x109d2'),
        BigInt(1000)
    );
    
    const proofData = JSON.parse(result);
    console.log('✅ 证明生成成功');
    console.log('  证明长度:', proofData.proof.length, '字符');
    console.log('  承诺值:', proofData.publicSignals[0]);
    console.log('  sufficient:', proofData.publicSignals[1]);
    
    // 第一次验证
    console.log('\n第一次验证...');
    try {
        const verified1 = wasmModule.wasm_verify_balance_proof(
            proofData.proof,
            proofData.publicSignals[0],
            proofData.publicSignals[1]
        );
        console.log('  结果:', verified1 ? '✅ 通过' : '❌ 失败');
    } catch (error) {
        console.error('  ❌ 错误:', error.message);
    }
    
    // 重新生成证明并验证
    console.log('\n重新生成证明并验证...');
    const result2 = wasmModule.wasm_generate_balance_proof(
        BigInt(5000),
        normalizeHex('0x3039'),
        normalizeHex('0x109d2'),
        BigInt(1000)
    );
    const proofData2 = JSON.parse(result2);
    
    try {
        const verified2 = wasmModule.wasm_verify_balance_proof(
            proofData2.proof,
            proofData2.publicSignals[0],
            proofData2.publicSignals[1]
        );
        console.log('  结果:', verified2 ? '✅ 通过' : '❌ 失败');
    } catch (error) {
        console.error('  ❌ 错误:', error.message);
    }
}

test().catch(console.error);
