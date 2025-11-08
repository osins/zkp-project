/**
 * Node SDK 与 Circom Circuits 集成验证脚本
 * 
 * 这个脚本验证 node-sdk 是否正确集成了 circom-circuits
 */

import { ProverClient } from '../src/proverClient';
import { VerifierClient } from '../src/verifierClient';
import * as path from 'path';
import * as fs from 'fs';

interface TestResult {
    name: string;
    passed: boolean;
    message: string;
    duration?: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    try {
        await testFn();
        const duration = Date.now() - startTime;
        results.push({
            name,
            passed: true,
            message: '✅ 通过',
            duration
        });
        console.log(`✅ ${name} (${duration}ms)`);
    } catch (error) {
        const duration = Date.now() - startTime;
        results.push({
            name,
            passed: false,
            message: `❌ 失败: ${error instanceof Error ? error.message : String(error)}`,
            duration
        });
        console.error(`❌ ${name} (${duration}ms)`);
        console.error(`   错误: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function main() {
    console.log('🚀 Node SDK 与 Circom Circuits 集成验证\n');
    console.log('=' .repeat(60));

    const buildDir = path.join(__dirname, '../../circom-circuits/build');
    const circuitName = 'example';

    // 测试 1: 检查构建产物
    await runTest('检查 circom-circuits 构建产物', async () => {
        const wasmPath = path.join(buildDir, `${circuitName}_js`, `${circuitName}.wasm`);
        const zkeyPath = path.join(buildDir, `${circuitName}_final.zkey`);
        const vkeyPath = path.join(buildDir, 'verification_key.json');

        if (!fs.existsSync(wasmPath)) {
            throw new Error(`WASM 文件不存在: ${wasmPath}`);
        }
        if (!fs.existsSync(zkeyPath)) {
            throw new Error(`zkey 文件不存在: ${zkeyPath}`);
        }
        if (!fs.existsSync(vkeyPath)) {
            throw new Error(`验证密钥不存在: ${vkeyPath}`);
        }

        console.log('   ✓ WASM 文件存在');
        console.log('   ✓ zkey 文件存在');
        console.log('   ✓ 验证密钥存在');
    });

    // 测试 2: ProverClient 初始化
    let prover: ProverClient;
    await runTest('初始化 ProverClient', async () => {
        prover = new ProverClient(circuitName, buildDir);
        console.log('   ✓ ProverClient 初始化成功');
    });

    // 测试 3: 生成零知识证明
    let proofData: any;
    await runTest('生成零知识证明', async () => {
        const input = {
            a: 3,
            b: 11
        };

        proofData = await prover.generateProof(input);

        if (!proofData || !proofData.proof || !proofData.publicSignals) {
            throw new Error('证明数据不完整');
        }

        console.log('   ✓ 证明生成成功');
        console.log(`   ✓ 公开信号: ${proofData.publicSignals.join(', ')}`);
    });

    // 测试 4: 验证公开信号计算正确
    await runTest('验证公开信号计算（3 * 11 = 33）', async () => {
        if (proofData.publicSignals[0] !== '33') {
            throw new Error(`公开信号错误: 期望 '33', 实际 '${proofData.publicSignals[0]}'`);
        }
        console.log('   ✓ 公开信号计算正确');
    });

    // 测试 5: VerifierClient 初始化
    let verifier: VerifierClient;
    await runTest('初始化 VerifierClient', async () => {
        const vkeyPath = path.join(buildDir, 'verification_key.json');
        verifier = new VerifierClient(vkeyPath);
        
        const vkInfo = verifier.getVerificationKeyInfo();
        console.log(`   ✓ 协议: ${vkInfo.protocol}`);
        console.log(`   ✓ 曲线: ${vkInfo.curve}`);
        console.log(`   ✓ 公开输入数量: ${vkInfo.nPublic}`);
    });

    // 测试 6: 链下验证证明
    await runTest('链下验证零知识证明', async () => {
        const result = await verifier.verify(proofData);

        if (!result.verified) {
            throw new Error('证明验证失败');
        }

        console.log('   ✓ 证明验证成功');
        console.log(`   ✓ 验证时间戳: ${new Date(result.timestamp).toISOString()}`);
    });

    // 测试 7: 导出 Solidity calldata
    await runTest('导出 Solidity calldata', async () => {
        const calldata = await prover.exportSolidityCallData(proofData);

        if (!calldata || typeof calldata !== 'string' || calldata.length === 0) {
            throw new Error('calldata 生成失败');
        }

        console.log(`   ✓ calldata 长度: ${calldata.length} 字符`);
    });

    // 测试 8: 保存和加载证明
    await runTest('保存和加载证明', async () => {
        const tempPath = path.join(buildDir, 'integration_test_proof.json');

        prover.saveProof(proofData, tempPath);

        if (!fs.existsSync(tempPath)) {
            throw new Error('证明文件保存失败');
        }

        const loadedProof = ProverClient.loadProof(tempPath);

        if (JSON.stringify(loadedProof) !== JSON.stringify(proofData)) {
            throw new Error('加载的证明与原始证明不一致');
        }

        // 清理
        fs.unlinkSync(tempPath);
        console.log('   ✓ 证明保存和加载成功');
    });

    // 测试 9: 多组输入测试
    await runTest('测试多组不同输入', async () => {
        const testCases = [
            { a: 2, b: 3, expected: '6' },
            { a: 5, b: 8, expected: '40' },
            { a: 10, b: 10, expected: '100' }
        ];

        for (const testCase of testCases) {
            const input = { a: testCase.a, b: testCase.b };
            const proof = await prover.generateProof(input);

            if (proof.publicSignals[0] !== testCase.expected) {
                throw new Error(`计算错误: ${testCase.a} * ${testCase.b} 应该等于 ${testCase.expected}, 但得到 ${proof.publicSignals[0]}`);
            }

            const result = await verifier.verify(proof);
            if (!result.verified) {
                throw new Error(`验证失败: ${testCase.a} * ${testCase.b}`);
            }
        }

        console.log('   ✓ 所有测试用例通过');
    });

    // 输出总结
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试总结\n');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

    console.log(`总测试数: ${results.length}`);
    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`⏱️  总耗时: ${totalDuration}ms`);
    console.log(`📈 通过率: ${((passed / results.length) * 100).toFixed(2)}%`);

    if (failed > 0) {
        console.log('\n❌ 失败的测试:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`   - ${r.name}: ${r.message}`);
        });
    }

    console.log('\n' + '='.repeat(60));

    if (failed > 0) {
        console.log('\n❌ 集成验证失败！');
        process.exit(1);
    } else {
        console.log('\n✅ 集成验证成功！node-sdk 已正确集成 circom-circuits');
        console.log('\n🎉 所有功能正常工作：');
        console.log('   ✓ 证明生成');
        console.log('   ✓ 证明验证');
        console.log('   ✓ Solidity calldata 导出');
        console.log('   ✓ 证明持久化');
        console.log('   ✓ 多输入测试');
        process.exit(0);
    }
}

main().catch(error => {
    console.error('\n💥 未捕获的错误:', error);
    process.exit(1);
});
