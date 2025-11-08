import { ProverClient } from '../src/proverClient';
import * as path from 'path';

async function main() {
    console.log('🚀 ZKP Proof Generation Script\n');

    try {
        // 初始化 Prover
        const buildDir = path.join(__dirname, '../../circom-circuits/build');
        const prover = new ProverClient('example', buildDir);

        // 准备输入（证明知道 a 和 b 使得 a * b = c）
        const input = {
            a: 3,
            b: 11
        };

        console.log('📋 Circuit input:', input);
        console.log('   Expected: c = 33\n');

        // 生成证明
        const proofData = await prover.generateProof(input);

        // 保存证明
        const outputPath = path.join(__dirname, '../../circom-circuits/build/generated_proof.json');
        prover.saveProof(proofData, outputPath);

        // 生成 Solidity calldata
        console.log('\n📤 Generating Solidity calldata...');
        const calldata = await prover.exportSolidityCallData(proofData);
        
        const calldataPath = path.join(__dirname, '../../circom-circuits/build/generated_calldata.txt');
        const fs = require('fs');
        fs.writeFileSync(calldataPath, calldata);
        
        console.log(`💾 Calldata saved to ${calldataPath}`);
        console.log('\n✅ Proof generation complete!\n');

        // 显示摘要
        console.log('📊 Summary:');
        console.log(`   Proof file: ${outputPath}`);
        console.log(`   Calldata file: ${calldataPath}`);
        console.log(`   Public signals: ${proofData.publicSignals.join(', ')}`);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();
