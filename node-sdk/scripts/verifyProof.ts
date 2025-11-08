import { VerifierClient, ProverClient } from '../src';
import * as path from 'path';

async function main() {
    console.log('🔍 ZKP Proof Verification Script\n');

    try {
        // 初始化 Verifier
        const vkeyPath = path.join(__dirname, '../../circom-circuits/build/verification_key.json');
        const verifier = new VerifierClient(vkeyPath);

        // 显示验证密钥信息
        console.log('🔑 Verification Key Info:');
        const vkInfo = verifier.getVerificationKeyInfo();
        console.log(`   Protocol: ${vkInfo.protocol}`);
        console.log(`   Curve: ${vkInfo.curve}`);
        console.log(`   Public inputs: ${vkInfo.nPublic}\n`);

        // 加载证明
        const proofPath = path.join(__dirname, '../../circom-circuits/build/generated_proof.json');
        console.log(`📂 Loading proof from: ${proofPath}`);
        const proofData = ProverClient.loadProof(proofPath);

        // 验证证明
        const result = await verifier.verify(proofData);

        // 显示结果
        console.log('\n📊 Verification Result:');
        console.log(`   Status: ${result.verified ? '✅ VALID' : '❌ INVALID'}`);
        console.log(`   Timestamp: ${new Date(result.timestamp).toISOString()}`);
        console.log(`   Public signals: ${proofData.publicSignals.join(', ')}`);

        if (!result.verified) {
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();
