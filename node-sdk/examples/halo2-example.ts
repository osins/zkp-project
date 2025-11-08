/**
 * Halo2 引擎使用示例
 * 
 * 场景: 链下验证平方计算
 */

import { ZKPClient, ProofEngine, CircuitType } from '../src/index';
import * as path from 'path';

async function main() {
    console.log('\n========================================');
    console.log('Halo2 引擎示例 - 平方电路');
    console.log('========================================\n');
    
    // 配置 Halo2 引擎
    const client = new ZKPClient({
        engine: ProofEngine.HALO2,
        circuitType: CircuitType.SQUARE,
        wasmPath: path.join(__dirname, '../../rust-prover/pkg'),
        verbose: true
    });
    
    // 初始化（会加载 WASM 模块）
    await client.init();
    
    // 获取电路信息
    console.log('\n📋 电路信息:');
    const circuitInfo = client.getCircuitInfo();
    console.log(`  名称: ${circuitInfo.name}`);
    console.log(`  引擎: ${circuitInfo.engine}`);
    console.log(`  链上验证: ${circuitInfo.supportsOnChainVerification ? '✅ 支持' : '❌ 不支持'}`);
    console.log(`  可信设置: ${circuitInfo.requiresTrustedSetup ? '⚠️ 需要' : '✅ 不需要'}`);
    
    // 生成证明
    console.log('\n🔐 生成证明...');
    const x = 42;
    const proofData = await client.generateProof({ x });
    
    console.log(`✅ 证明生成成功!`);
    console.log(`  输入 x: ${x}`);
    console.log(`  输出 y: ${proofData.publicSignals.y}`);
    console.log(`  大小: ${proofData.metadata?.proofSize} bytes`);
    console.log(`  耗时: ${proofData.metadata?.generationTime}ms`);
    
    // 保存证明
    const proofPath = path.join(__dirname, '../proof_halo2.json');
    client.saveProof(proofData, proofPath);
    
    // 验证证明
    console.log('\n🔍 验证证明...');
    const verificationResult = await client.verify(proofData);
    
    if (verificationResult.verified) {
        console.log('✅ 证明验证成功!');
        console.log(`  耗时: ${verificationResult.duration}ms`);
    } else {
        console.log('❌ 证明验证失败!');
        if (verificationResult.error) {
            console.log(`  错误: ${verificationResult.error}`);
        }
    }
    
    // 尝试导出链上数据（会失败，展示错误处理）
    console.log('\n⛓️ 检查链上验证支持...');
    if (client.canVerifyOnChain()) {
        console.log('✅ 支持链上验证');
    } else {
        console.log('ℹ️ 不支持链上验证');
        console.log('  原因: Halo2 使用 Pasta curves，EVM 不支持');
        console.log('  建议: 链下验证后签发链上凭证');
    }
    
    // 引擎性能信息
    console.log('\n📊 引擎性能:');
    const capabilities = client.getEngineCapabilities();
    console.log(`  证明系统: ${capabilities.proofSystem}`);
    console.log(`  椭圆曲线: ${capabilities.curve}`);
    console.log(`  平均证明大小: ${capabilities.avgProofSize} bytes`);
    console.log(`  平均生成时间: ${capabilities.avgGenerationTime}ms`);
    console.log(`  平均验证时间: ${capabilities.avgVerificationTime}ms`);
    
    console.log('\n========================================');
    console.log('示例完成!');
    console.log('========================================\n');
}

main().catch(console.error);
