/**
 * Circom 引擎使用示例
 * 
 * 场景: 链上验证年龄证明
 */

import { ZKPClient, ProofEngine, CircuitType } from '../src/index';
import * as path from 'path';

async function main() {
    console.log('\n========================================');
    console.log('Circom 引擎示例 - 年龄验证');
    console.log('========================================\n');
    
    // 配置 Circom 引擎
    const client = new ZKPClient({
        engine: ProofEngine.CIRCOM,
        circuitType: CircuitType.AGE_VERIFICATION,
        buildDir: path.join(__dirname, '../../circom-circuits/build'),
        verbose: true
    });
    
    // 初始化
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
    const proofData = await client.generateProof({
        age: 25,
        minAge: 18,
        maxAge: 65
    });
    
    console.log(`✅ 证明生成成功!`);
    console.log(`  大小: ${proofData.metadata?.proofSize} bytes`);
    console.log(`  耗时: ${proofData.metadata?.generationTime}ms`);
    
    // 保存证明
    const proofPath = path.join(__dirname, '../proof_circom.json');
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
    
    // 导出链上调用数据
    if (client.canVerifyOnChain()) {
        console.log('\n⛓️ 导出链上调用数据...');
        const calldata = await client.exportSolidityCallData(proofData);
        console.log('✅ Solidity CallData 已生成');
        console.log(`  (可用于智能合约验证)`);
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
