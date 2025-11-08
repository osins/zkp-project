/**
 * Node SDK 与 Circom Circuits 集成测试
 * 
 * 测试目标：
 * 1. 验证 ProverClient 能正确加载 circom-circuits 构建产物
 * 2. 验证 VerifierClient 能正确验证证明
 * 3. 验证完整的证明生成和验证流程
 */

import { ProverClient } from '../proverClient';
import { VerifierClient } from '../verifierClient';
import * as path from 'path';
import * as fs from 'fs';

describe('Node SDK 与 Circom Circuits 集成测试', () => {
    const buildDir = path.join(__dirname, '../../../circom-circuits/build');
    const circuitName = 'example';

    // 测试前检查环境
    beforeAll(() => {
        const wasmPath = path.join(buildDir, `${circuitName}_js`, `${circuitName}.wasm`);
        const zkeyPath = path.join(buildDir, `${circuitName}_final.zkey`);
        const vkeyPath = path.join(buildDir, 'verification_key.json');

        if (!fs.existsSync(wasmPath)) {
            throw new Error(`测试环境未准备好：缺少 WASM 文件 ${wasmPath}`);
        }
        if (!fs.existsSync(zkeyPath)) {
            throw new Error(`测试环境未准备好：缺少 zkey 文件 ${zkeyPath}`);
        }
        if (!fs.existsSync(vkeyPath)) {
            throw new Error(`测试环境未准备好：缺少验证密钥 ${vkeyPath}`);
        }
    });

    describe('ProverClient 集成测试', () => {
        let prover: ProverClient;

        beforeEach(() => {
            prover = new ProverClient(circuitName, buildDir);
        });

        test('应该成功初始化 ProverClient', () => {
            expect(prover).toBeDefined();
        });

        test('应该能生成有效的零知识证明', async () => {
            const input = {
                a: 3,
                b: 11
            };

            const proofData = await prover.generateProof(input);

            expect(proofData).toBeDefined();
            expect(proofData.proof).toBeDefined();
            expect(proofData.publicSignals).toBeDefined();
            expect(Array.isArray(proofData.publicSignals)).toBe(true);
            expect(proofData.publicSignals.length).toBeGreaterThan(0);
        }, 30000); // 30秒超时

        test('应该正确计算公开信号（3 * 11 = 33）', async () => {
            const input = {
                a: 3,
                b: 11
            };

            const proofData = await prover.generateProof(input);
            const publicOutput = proofData.publicSignals[0];

            expect(publicOutput).toBe('33');
        }, 30000);

        test('应该能导出 Solidity calldata', async () => {
            const input = {
                a: 5,
                b: 7
            };

            const proofData = await prover.generateProof(input);
            const calldata = await prover.exportSolidityCallData(proofData);

            expect(calldata).toBeDefined();
            expect(typeof calldata).toBe('string');
            expect(calldata.length).toBeGreaterThan(0);
        }, 30000);

        test('应该能保存和加载证明', async () => {
            const input = {
                a: 2,
                b: 4
            };

            const proofData = await prover.generateProof(input);
            const tempPath = path.join(buildDir, 'test_proof_temp.json');

            // 保存证明
            prover.saveProof(proofData, tempPath);
            expect(fs.existsSync(tempPath)).toBe(true);

            // 加载证明
            const loadedProof = ProverClient.loadProof(tempPath);
            expect(loadedProof).toBeDefined();
            expect(loadedProof.proof).toEqual(proofData.proof);
            expect(loadedProof.publicSignals).toEqual(proofData.publicSignals);

            // 清理
            fs.unlinkSync(tempPath);
        }, 30000);
    });

    describe('VerifierClient 集成测试', () => {
        let verifier: VerifierClient;
        const vkeyPath = path.join(buildDir, 'verification_key.json');

        beforeEach(() => {
            verifier = new VerifierClient(vkeyPath);
        });

        test('应该成功初始化 VerifierClient', () => {
            expect(verifier).toBeDefined();
        });

        test('应该能获取验证密钥信息', () => {
            const vkInfo = verifier.getVerificationKeyInfo();

            expect(vkInfo).toBeDefined();
            expect(vkInfo.protocol).toBe('groth16');
            expect(vkInfo.curve).toBe('bn128');
            expect(vkInfo.nPublic).toBeDefined();
        });

        test('应该能验证有效的证明', async () => {
            const prover = new ProverClient(circuitName, buildDir);
            const input = {
                a: 3,
                b: 11
            };

            const proofData = await prover.generateProof(input);
            const result = await verifier.verify(proofData);

            expect(result).toBeDefined();
            expect(result.verified).toBe(true);
            expect(result.timestamp).toBeDefined();
        }, 30000);

        test('应该能检测无效的证明', async () => {
            const prover = new ProverClient(circuitName, buildDir);
            const input = {
                a: 3,
                b: 11
            };

            const proofData = await prover.generateProof(input);
            
            // 篡改公开信号
            proofData.publicSignals[0] = '999';

            const result = await verifier.verify(proofData);

            expect(result).toBeDefined();
            expect(result.verified).toBe(false);
        }, 30000);

        test('应该能验证公开信号匹配', () => {
            const publicSignals = ['33', '1'];
            const expected = ['33', '1'];

            const isMatch = verifier.verifyPublicSignals(publicSignals, expected);
            expect(isMatch).toBe(true);
        });

        test('应该能检测公开信号不匹配', () => {
            const publicSignals = ['33', '1'];
            const expected = ['34', '1'];

            const isMatch = verifier.verifyPublicSignals(publicSignals, expected);
            expect(isMatch).toBe(false);
        });
    });

    describe('完整的证明生成和验证流程', () => {
        test('应该能完成完整的 ZKP 流程（生成→验证）', async () => {
            // 1. 初始化
            const prover = new ProverClient(circuitName, buildDir);
            const verifier = new VerifierClient(path.join(buildDir, 'verification_key.json'));

            // 2. 准备输入
            const input = {
                a: 7,
                b: 6
            };

            // 3. 生成证明
            const proofData = await prover.generateProof(input);
            expect(proofData).toBeDefined();

            // 4. 验证公开信号
            expect(proofData.publicSignals[0]).toBe('42'); // 7 * 6 = 42

            // 5. 验证证明
            const result = await verifier.verify(proofData);
            expect(result.verified).toBe(true);

            // 6. 生成链上验证数据
            const calldata = await prover.exportSolidityCallData(proofData);
            expect(calldata).toBeDefined();
            expect(calldata.length).toBeGreaterThan(0);
        }, 30000);

        test('应该能处理多个不同的输入', async () => {
            const prover = new ProverClient(circuitName, buildDir);
            const verifier = new VerifierClient(path.join(buildDir, 'verification_key.json'));

            const testCases = [
                { a: 2, b: 3, expected: '6' },
                { a: 5, b: 8, expected: '40' },
                { a: 10, b: 10, expected: '100' }
            ];

            for (const testCase of testCases) {
                const input = { a: testCase.a, b: testCase.b };
                const proofData = await prover.generateProof(input);
                
                expect(proofData.publicSignals[0]).toBe(testCase.expected);
                
                const result = await verifier.verify(proofData);
                expect(result.verified).toBe(true);
            }
        }, 60000);
    });

    describe('错误处理测试', () => {
        test('应该在缺少 WASM 文件时抛出错误', () => {
            expect(() => {
                new ProverClient('nonexistent', buildDir);
            }).toThrow(/WASM file not found/);
        });

        test('应该在缺少 zkey 文件时抛出错误', () => {
            // 创建一个假的 WASM 目录但没有 zkey
            const fakeBuildDir = path.join(buildDir, 'fake');
            if (!fs.existsSync(fakeBuildDir)) {
                fs.mkdirSync(fakeBuildDir, { recursive: true });
            }
            const fakeWasmDir = path.join(fakeBuildDir, 'nonexistent_js');
            if (!fs.existsSync(fakeWasmDir)) {
                fs.mkdirSync(fakeWasmDir, { recursive: true });
            }
            fs.writeFileSync(path.join(fakeWasmDir, 'nonexistent.wasm'), '');

            expect(() => {
                new ProverClient('nonexistent', fakeBuildDir);
            }).toThrow(/zkey file not found/);

            // 清理
            fs.unlinkSync(path.join(fakeWasmDir, 'nonexistent.wasm'));
            fs.rmdirSync(fakeWasmDir);
            fs.rmdirSync(fakeBuildDir);
        });

        test('应该在缺少验证密钥时抛出错误', () => {
            expect(() => {
                new VerifierClient('/nonexistent/path/vkey.json');
            }).toThrow(/Verification key not found/);
        });
    });
});
