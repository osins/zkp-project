/**
 * 简单的 WASM 测试脚本 - 生产级真实证明测试
 */

import init, { wasm_generate_proof, wasm_verify_proof } from '../pkg/zkp_rust_prover.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('测试 WASM 模块（生产级真实证明）...\n');

async function main() {
    // 计算当前目录
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // 加载 WASM 文件
    const wasmPath = path.join(__dirname, '../pkg/zkp_rust_prover_bg.wasm');
    if (!fs.existsSync(wasmPath)) {
        throw new Error(`找不到 WASM 文件: ${wasmPath}`);
    }

    const wasmBytes = fs.readFileSync(wasmPath);
    await init(wasmBytes);
    
    try {
        console.log('步骤 1: 生成真实 ZK 证明，输入值 x = 5');
        const proof = wasm_generate_proof(5);

        console.log('✅ 真实证明生成成功');
        console.log('证明大小:', proof.length, '字节');

        const preview = Buffer.from(proof.slice(0, 64)).toString('hex');
        console.log('证明数据 (前 64 字节):', preview);

        console.log('\n步骤 2: 验证真实 ZK 证明');
        const isValid = wasm_verify_proof(proof);

        console.log('验证结果:', isValid ? '✅ 有效' : '❌ 无效');
        
        if (!isValid) {
            throw new Error('证明验证失败');
        }
        
        console.log('\n✅ 所有测试通过 - 生产级真实证明系统运行正常');
    } catch (error) {
        console.error('❌ 错误:', error);
        console.error('错误堆栈:', error.stack);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('❌ 全局错误:', err);
    console.error(err.stack);
});
