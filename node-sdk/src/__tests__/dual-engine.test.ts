/**
 * 双引擎集成测试
 */

import { ZKPClient, ProofEngine, CircuitType } from '../index';
import * as path from 'path';

describe('双引擎 ZKP 集成测试', () => {
    const circomBuildDir = path.join(__dirname, '../../../circom-circuits/build');
    const rustWasmPath = path.join(__dirname, '../../../rust-prover/pkg');
    
    // Halo2 测试（WASM 已构建）
    describe('Halo2 引擎 - Square 电路', () => {
        let client: ZKPClient;
        
        beforeAll(async () => {
            client = new ZKPClient({
                engine: ProofEngine.HALO2,
                circuitType: CircuitType.SQUARE,
                wasmPath: rustWasmPath,
                verbose: false
            });
            
            await client.init();
        });
        
        test('生成和验证证明', async () => {
            const x = 42;
            const expectedY = x * x;
            
            // 生成证明
            const proofData = await client.generateProof({ x });
            
            // 验证证明结构
            expect(proofData.engine).toBe(ProofEngine.HALO2);
            expect(proofData.circuitType).toBe(CircuitType.SQUARE);
            expect(proofData.proof).toBeDefined();
            expect(proofData.publicSignals).toBeDefined();
            expect((proofData.publicSignals as Record<string, string>).y).toBe(expectedY.toString());
            
            // 验证证明
            const verificationResult = await client.verify(proofData);
            expect(verificationResult.verified).toBe(true);
        }, 30000);
        
        test('不支持链上验证', async () => {
            expect(client.canVerifyOnChain()).toBe(false);
            
            const proofData = await client.generateProof({ x: 10 });
            
            await expect(
                client.exportSolidityCallData(proofData)
            ).rejects.toThrow(/不支持链上验证/);
        });
        
        test('获取电路信息', () => {
            const info = client.getCircuitInfo();
            
            expect(info.name).toBe('Square Circuit');
            expect(info.type).toBe(CircuitType.SQUARE);
            expect(info.engine).toBe(ProofEngine.HALO2);
            expect(info.supportsOnChainVerification).toBe(false);
            expect(info.requiresTrustedSetup).toBe(false);
        });
        
        test('获取引擎能力', () => {
            const capabilities = client.getEngineCapabilities();
            
            expect(capabilities.name).toBe('Rust (Halo2)');
            expect(capabilities.proofSystem).toBe('PLONK/Halo2');
            expect(capabilities.curve).toBe('Pasta (Pallas/Vesta)');
            expect(capabilities.onChainVerification).toBe(false);
            expect(capabilities.trustedSetup).toBe(false);
        });
    });
    
    // Circom 测试（仅在构建目录存在时运行）
    const circomTestsEnabled = require('fs').existsSync(circomBuildDir) && 
                               require('fs').existsSync(path.join(circomBuildDir, 'example_js', 'example.wasm'));
    
    (circomTestsEnabled ? describe : describe.skip)('Circom 引擎 - Example 电路', () => {
        let client: ZKPClient;
        
        beforeAll(async () => {
            client = new ZKPClient({
                engine: ProofEngine.CIRCOM,
                circuitType: CircuitType.EXAMPLE,
                buildDir: circomBuildDir,  // 直接使用 build 根目录
                verbose: false
            });
            
            await client.init();
        });
        
        test('生成和验证证明', async () => {
            const a = 3;
            const b = 4;
            const expectedC = a * b;
            
            // 生成证明
            const proofData = await client.generateProof({ a, b });
            
            // 验证证明结构
            expect(proofData.engine).toBe(ProofEngine.CIRCOM);
            expect(proofData.circuitType).toBe(CircuitType.EXAMPLE);
            expect(proofData.proof).toBeDefined();
            expect(proofData.publicSignals).toBeDefined();
            expect((proofData.publicSignals as string[])[0]).toBe(expectedC.toString());
            
            // 验证证明
            const verificationResult = await client.verify(proofData);
            expect(verificationResult.verified).toBe(true);
        }, 30000);
        
        test('支持链上验证', async () => {
            expect(client.canVerifyOnChain()).toBe(true);
            
            const proofData = await client.generateProof({ a: 2, b: 3 });
            const calldata = await client.exportSolidityCallData(proofData);
            
            expect(calldata).toBeDefined();
            expect(typeof calldata).toBe('string');
        });
        
        test('获取电路信息', () => {
            const info = client.getCircuitInfo();
            
            expect(info.name).toBe('Example Multiplier');
            expect(info.type).toBe(CircuitType.EXAMPLE);
            expect(info.engine).toBe(ProofEngine.CIRCOM);
            expect(info.supportsOnChainVerification).toBe(true);
            expect(info.requiresTrustedSetup).toBe(true);
        });
        
        test('获取引擎能力', () => {
            const capabilities = client.getEngineCapabilities();
            
            expect(capabilities.name).toBe('Circom (Groth16)');
            expect(capabilities.proofSystem).toBe('Groth16');
            expect(capabilities.curve).toBe('BN128 (alt_bn128)');
            expect(capabilities.onChainVerification).toBe(true);
            expect(capabilities.trustedSetup).toBe(true);
        });
    });
});
