/**
 * Halo2 AgeVerification 单引擎测试
 * 
 * 目的：验证 Halo2 引擎的 AgeVerification 实现是否正确
 * 不依赖 Circom 引擎（避免构建依赖）
 */

import { ZKPClient } from '../core/ZKPClient';
import { ProofEngine, CircuitType } from '../types/engines';
import * as path from 'path';

describe('Halo2 AgeVerification - 单引擎测试', () => {
    let halo2Client: ZKPClient;
    
    const WASM_PATH = path.resolve(__dirname, '../../../rust-prover/pkg');
    
    beforeAll(async () => {
        // 初始化 Halo2 引擎
        halo2Client = new ZKPClient({
            engine: ProofEngine.HALO2,
            circuitType: CircuitType.AGE_VERIFICATION,
            wasmPath: WASM_PATH
        });
        
        await halo2Client.init();
    });
    
    describe('1. 基础功能测试', () => {
        test('有效年龄 - 生成证明', async () => {
            const input = {
                age: 25,
                salt: "0x3039",
                minAge: 18,
                maxAge: 65
            };
            
            const result = await halo2Client.generateProof(input);
            
            expect(result).toBeDefined();
            expect(result.proof).toBeDefined();
            expect(result.publicSignals).toBeDefined();
            expect(Array.isArray(result.publicSignals)).toBe(true);
            
            // 检查 publicSignals 格式（Halo2 应该返回数组）
            expect(Array.isArray(result.publicSignals)).toBe(true);
            const signals = result.publicSignals as string[];
            expect(signals.length).toBe(2);
            
            // publicSignals[0] = commitment
            // publicSignals[1] = valid (应该是 "1")
            console.log('Halo2 证明:', {
                proof: typeof result.proof === 'string' ? result.proof.substring(0, 20) + '...' : 'Uint8Array',
                commitment: signals[0],
                valid: signals[1]
            });
            
            // 验证 valid 为 1（有效）
            expect(signals[1]).toBe("1");
        }, 30000);
        
        test('太年轻 - 生成证明', async () => {
            const input = {
                age: 16,
                salt: "0x3039",
                minAge: 18,
                maxAge: 65
            };
            
            const result = await halo2Client.generateProof(input);
            
            expect(result).toBeDefined();
            expect(result.publicSignals).toBeDefined();
            const signals = result.publicSignals as string[];
            
            console.log('Halo2 证明 (太年轻):', {
                valid: signals[1]
            });
            
            // 验证 valid 为 0（无效）
            expect(signals[1]).toBe("0");
        }, 30000);
        
        test('太老 - 生成证明', async () => {
            const input = {
                age: 70,
                salt: "0x3039",
                minAge: 18,
                maxAge: 65
            };
            
            const result = await halo2Client.generateProof(input);
            
            expect(result).toBeDefined();
            expect(result.publicSignals).toBeDefined();
            const signals = result.publicSignals as string[];
            
            console.log('Halo2 证明 (太老):', {
                valid: signals[1]
            });
            
            // 验证 valid 为 0（无效）
            expect(signals[1]).toBe("0");
        }, 30000);
    });
    
    describe('2. 边界值测试', () => {
        test('恰好等于 minAge', async () => {
            const input = {
                age: 18,
                salt: "0x3039",
                minAge: 18,
                maxAge: 65
            };
            
            const result = await halo2Client.generateProof(input);
            expect((result.publicSignals as string[])[1]).toBe("1");  // 应该有效
        }, 30000);
        
        test('恰好等于 maxAge', async () => {
            const input = {
                age: 65,
                salt: "0x3039",
                minAge: 18,
                maxAge: 65
            };
            
            const result = await halo2Client.generateProof(input);
            expect((result.publicSignals as string[])[1]).toBe("1");  // 应该有效
        }, 30000);
        
        test('minAge - 1', async () => {
            const input = {
                age: 17,
                salt: "0x3039",
                minAge: 18,
                maxAge: 65
            };
            
            const result = await halo2Client.generateProof(input);
            expect((result.publicSignals as string[])[1]).toBe("0");  // 应该无效
        }, 30000);
        
        test('maxAge + 1', async () => {
            const input = {
                age: 66,
                salt: "0x3039",
                minAge: 18,
                maxAge: 65
            };
            
            const result = await halo2Client.generateProof(input);
            expect((result.publicSignals as string[])[1]).toBe("0");  // 应该无效
        }, 30000);
    });
    
    describe('3. 承诺一致性测试', () => {
        test('相同输入应生成相同承诺', async () => {
            const input = {
                age: 25,
                salt: "0x3039",
                minAge: 18,
                maxAge: 65
            };
            
            const result1 = await halo2Client.generateProof(input);
            const result2 = await halo2Client.generateProof(input);
            
            const signals1 = result1.publicSignals as string[];
            const signals2 = result2.publicSignals as string[];
            
            // 承诺应该一致
            expect(signals1[0]).toBe(signals2[0]);
            // valid 也应该一致
            expect(signals1[1]).toBe(signals2[1]);
        }, 30000);
        
        test('不同 salt 应生成不同承诺', async () => {
            const input1 = {
                age: 25,
                salt: "0x3039",
                minAge: 18,
                maxAge: 65
            };
            
            const input2 = {
                age: 25,
                salt: "0x4040",  // 不同的 salt
                minAge: 18,
                maxAge: 65
            };
            
            const result1 = await halo2Client.generateProof(input1);
            const result2 = await halo2Client.generateProof(input2);
            
            const signals1 = result1.publicSignals as string[];
            const signals2 = result2.publicSignals as string[];
            
            // 承诺应该不同
            expect(signals1[0]).not.toBe(signals2[0]);
            // 但 valid 应该相同（都是 1）
            expect(signals1[1]).toBe("1");
            expect(signals2[1]).toBe("1");
        }, 30000);
    });
    
    describe('4. 性能测试', () => {
        test('证明生成性能', async () => {
            const input = {
                age: 25,
                salt: "0x3039",
                minAge: 18,
                maxAge: 65
            };
            
            const startTime = Date.now();
            await halo2Client.generateProof(input);
            const endTime = Date.now();
            
            const duration = endTime - startTime;
            
            console.log(`Halo2 证明生成耗时: ${duration}ms`);
            
            // 性能断言（应该在 5 秒内完成）
            expect(duration).toBeLessThan(5000);
        }, 30000);
    });
});
