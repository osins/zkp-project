/**
 * 简单的 WASM 测试脚本 - 用于调试
 */

const { wasm_generate_proof, wasm_verify_proof } = require('../pkg/rust_prover.js');

console.log('测试 WASM 模块...\n');

try {
    console.log('步骤 1: 生成证明，输入值 = 5');
    const proof = wasm_generate_proof(5);
    console.log('✅ 证明生成成功');
    console.log('证明大小:', proof.length, '字节');
    console.log('证明数据 (前 64 字节):', Buffer.from(proof.slice(0, 64)).toString('hex'));
    
    console.log('\n步骤 2: 验证证明');
    const isValid = wasm_verify_proof(proof);
    console.log('验证结果:', isValid ? '✅ 有效' : '❌ 无效');
    
} catch (error) {
    console.error('❌ 错误:', error);
    console.error('错误堆栈:', error.stack);
}
