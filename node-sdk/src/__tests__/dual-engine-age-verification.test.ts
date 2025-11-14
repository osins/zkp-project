/**
 * AgeVerification 双引擎测试
 * 
 * 验证 Circom 和 Halo2 两个引擎对同一电路的实现一致性
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { ZKPClient } from '../core/ZKPClient';
import { ProofEngine, CircuitType } from '../types/engines';
import * as path from 'path';

describe('AgeVerification 双引擎测试', () => {
    // Circom 客户端
    let circomClient: ZKPClient;
    
    // Halo2 客户端
    let halo2Client: ZKPClient;
    
    // 测试输入
    const testInput = {
        age: 25,
        salt: "0x3039",
        minAge: 18,
        maxAge: 65
    };
    
    beforeAll(async () => {
        // 初始化 Circom 客户端
        circomClient = new ZKPClient({
            engine: ProofEngine.CIRCOM,
            circuitType: CircuitType.AGE_VERIFICATION,
            buildDir: path.join(__dirname, '../../../circom-circuits/build/production'),
            verbose: true
        });
        
        // 初始化 Halo2 客户端
        halo2Client = new ZKPClient({
            engine: ProofEngine.HALO2,
            circuitType: CircuitType.AGE_VERIFICATION,
            wasmPath: path.join(__dirname, '../../../rust-prover/pkg/zkp_rust_prover.js'),
            verbose: true
        });
        
        // 预初始化
        await circomClient.init();
        await halo2Client.init();
    }, 30000);  // 30秒超时
    
    it('Circom 引擎: 生成并验证年龄证明（有效年龄）', async () => {
        console.log('\n[Circom] 测试有效年龄...');
        
        // 生成证明
        const proofData = await circomClient.generateProof(testInput);
        
        expect(proofData.engine).toBe(ProofEngine.CIRCOM);
        expect(proofData.circuitType).toBe(CircuitType.AGE_VERIFICATION);
        expect(proofData.proof).toBeDefined();
        expect(proofData.publicSignals).toBeDefined();
        
        // Circom 输出: [valid]
        // valid 应该是 1 (有效)
        const validSignal = Array.isArray(proofData.publicSignals) 
            ? proofData.publicSignals[0] 
            : proofData.publicSignals['valid'];
        
        expect(validSignal).toBe('1');  // 年龄 25 在 [18, 65] 范围内
        
        // 验证证明
        const verifyResult = await circomClient.verify(proofData);
        
        expect(verifyResult.verified).toBe(true);
        
        console.log(`[Circom] 生成耗时: ${proofData.metadata?.generationTime}ms`);
        console.log(`[Circom] 验证耗时: ${verifyResult.duration}ms`);
        console.log(`[Circom] 证明大小: ${proofData.metadata?.proofSize} bytes`);
        
    }, 60000);  // 60秒超时
    
    it('Halo2 引擎: 生成并验证年龄证明（有效年龄）', async () => {
        console.log('\n[Halo2] 测试有效年龄...');
        
        // 生成证明
        const proofData = await halo2Client.generateProof(testInput);
        
        expect(proofData.engine).toBe(ProofEngine.HALO2);
        expect(proofData.circuitType).toBe(CircuitType.AGE_VERIFICATION);
        expect(proofData.proof).toBeDefined();
        expect(proofData.publicSignals).toBeDefined();
        
        // Halo2 输出: [commitment, valid]
        // valid 应该是 1 (有效)
        const validSignal = Array.isArray(proofData.publicSignals) 
            ? proofData.publicSignals[1]  // Halo2: [commitment, valid]
            : proofData.publicSignals['valid'];
        
        expect(validSignal).toBe('1');  // 年龄 25 在 [18, 65] 范围内
        
        // 验证证明
        const verifyResult = await halo2Client.verify(proofData);
        
        expect(verifyResult.verified).toBe(true);
        
        console.log(`[Halo2] 生成耗时: ${proofData.metadata?.generationTime}ms`);
        console.log(`[Halo2] 验证耗时: ${verifyResult.duration}ms`);
        console.log(`[Halo2] 证明大小: ${proofData.metadata?.proofSize} bytes`);
        
    }, 180000);  // 180秒超时（Debug 模式证明生成较慢）
    
    it('双引擎一致性: 相同输入产生相同的 valid 输出', async () => {
        console.log('\n[双引擎] 测试一致性...');
        
        // Circom 证明
        const circomProof = await circomClient.generateProof(testInput);
        const circomValid = Array.isArray(circomProof.publicSignals) 
            ? circomProof.publicSignals[0] 
            : circomProof.publicSignals['valid'];
        
        // Halo2 证明
        const halo2Proof = await halo2Client.generateProof(testInput);
        const halo2Valid = Array.isArray(halo2Proof.publicSignals) 
            ? halo2Proof.publicSignals[1]  // Halo2: [commitment, valid]
            : halo2Proof.publicSignals['valid'];
        
        // 两个引擎的 valid 输出应该相同
        expect(circomValid).toBe(halo2Valid);
        expect(circomValid).toBe('1');
        
        console.log(`✅ Circom valid: ${circomValid}`);
        console.log(`✅ Halo2 valid: ${halo2Valid}`);
        console.log(`✅ 一致性验证通过`);
        
    }, 240000);  // 240秒超时
    
    it('双引擎一致性: 无效年龄（太年轻）', async () => {
        console.log('\n[双引擎] 测试无效年龄（太年轻）...');
        
        const invalidInput = {
            ...testInput,
            age: 17  // 小于 minAge (18)
        };
        
        // Circom 证明
        const circomProof = await circomClient.generateProof(invalidInput);
        const circomValid = Array.isArray(circomProof.publicSignals) 
            ? circomProof.publicSignals[0] 
            : circomProof.publicSignals['valid'];
        
        // Halo2 证明
        const halo2Proof = await halo2Client.generateProof(invalidInput);
        const halo2Valid = Array.isArray(halo2Proof.publicSignals) 
            ? halo2Proof.publicSignals[1] 
            : halo2Proof.publicSignals['valid'];
        
        // 两个引擎的 valid 输出应该都是 0（无效）
        expect(circomValid).toBe('0');
        expect(halo2Valid).toBe('0');
        expect(circomValid).toBe(halo2Valid);
        
        console.log(`✅ Circom valid: ${circomValid} (invalid)`);
        console.log(`✅ Halo2 valid: ${halo2Valid} (invalid)`);
        console.log(`✅ 一致性验证通过`);
        
    }, 240000);
    
    it('双引擎一致性: 无效年龄（太老）', async () => {
        console.log('\n[双引擎] 测试无效年龄（太老）...');
        
        const invalidInput = {
            ...testInput,
            age: 70  // 大于 maxAge (65)
        };
        
        // Circom 证明
        const circomProof = await circomClient.generateProof(invalidInput);
        const circomValid = Array.isArray(circomProof.publicSignals) 
            ? circomProof.publicSignals[0] 
            : circomProof.publicSignals['valid'];
        
        // Halo2 证明
        const halo2Proof = await halo2Client.generateProof(invalidInput);
        const halo2Valid = Array.isArray(halo2Proof.publicSignals) 
            ? halo2Proof.publicSignals[1] 
            : halo2Proof.publicSignals['valid'];
        
        // 两个引擎的 valid 输出应该都是 0（无效）
        expect(circomValid).toBe('0');
        expect(halo2Valid).toBe('0');
        expect(circomValid).toBe(halo2Valid);
        
        console.log(`✅ Circom valid: ${circomValid} (invalid)`);
        console.log(`✅ Halo2 valid: ${halo2Valid} (invalid)`);
        console.log(`✅ 一致性验证通过`);
        
    }, 240000);
    
    it('双引擎一致性: 边界值测试（minAge）', async () => {
        console.log('\n[双引擎] 测试边界值（minAge = 18）...');
        
        const boundaryInput = {
            ...testInput,
            age: 18  // 等于 minAge
        };
        
        // Circom 证明
        const circomProof = await circomClient.generateProof(boundaryInput);
        const circomValid = Array.isArray(circomProof.publicSignals) 
            ? circomProof.publicSignals[0] 
            : circomProof.publicSignals['valid'];
        
        // Halo2 证明
        const halo2Proof = await halo2Client.generateProof(boundaryInput);
        const halo2Valid = Array.isArray(halo2Proof.publicSignals) 
            ? halo2Proof.publicSignals[1] 
            : halo2Proof.publicSignals['valid'];
        
        // 边界值应该有效（>= minAge）
        expect(circomValid).toBe('1');
        expect(halo2Valid).toBe('1');
        expect(circomValid).toBe(halo2Valid);
        
        console.log(`✅ Circom valid: ${circomValid} (valid)`);
        console.log(`✅ Halo2 valid: ${halo2Valid} (valid)`);
        console.log(`✅ 边界值一致性验证通过`);
        
    }, 240000);
    
    it('双引擎一致性: 边界值测试（maxAge）', async () => {
        console.log('\n[双引擎] 测试边界值（maxAge = 65）...');
        
        const boundaryInput = {
            ...testInput,
            age: 65  // 等于 maxAge
        };
        
        // Circom 证明
        const circomProof = await circomClient.generateProof(boundaryInput);
        const circomValid = Array.isArray(circomProof.publicSignals) 
            ? circomProof.publicSignals[0] 
            : circomProof.publicSignals['valid'];
        
        // Halo2 证明
        const halo2Proof = await halo2Client.generateProof(boundaryInput);
        const halo2Valid = Array.isArray(halo2Proof.publicSignals) 
            ? halo2Proof.publicSignals[1] 
            : halo2Proof.publicSignals['valid'];
        
        // 边界值应该有效（<= maxAge）
        expect(circomValid).toBe('1');
        expect(halo2Valid).toBe('1');
        expect(circomValid).toBe(halo2Valid);
        
        console.log(`✅ Circom valid: ${circomValid} (valid)`);
        console.log(`✅ Halo2 valid: ${halo2Valid} (valid)`);
        console.log(`✅ 边界值一致性验证通过`);
        
    }, 240000);
    
    it('性能对比: Circom vs Halo2', async () => {
        console.log('\n[性能对比] Circom vs Halo2...\n');
        
        // Circom 性能测试
        const circomStart = Date.now();
        const circomProof = await circomClient.generateProof(testInput);
        const circomTime = Date.now() - circomStart;
        
        // Halo2 性能测试
        const halo2Start = Date.now();
        const halo2Proof = await halo2Client.generateProof(testInput);
        const halo2Time = Date.now() - halo2Start;
        
        console.log('========================================');
        console.log('性能对比结果');
        console.log('========================================');
        console.log(`Circom (Groth16):`);
        console.log(`  生成时间: ${circomTime}ms`);
        console.log(`  证明大小: ${circomProof.metadata?.proofSize} bytes`);
        console.log(`  可信设置: 需要`);
        console.log(`  链上验证: ✅ 支持`);
        console.log('');
        console.log(`Halo2 (PLONK):`);
        console.log(`  生成时间: ${halo2Time}ms`);
        console.log(`  证明大小: ${halo2Proof.metadata?.proofSize} bytes`);
        console.log(`  可信设置: ❌ 不需要`);
        console.log(`  链上验证: ❌ 不支持（椭圆曲线不兼容）`);
        console.log('');
        console.log(`速度比: Circom / Halo2 = ${(circomTime / halo2Time).toFixed(2)}x`);
        console.log(`大小比: Circom / Halo2 = ${((circomProof.metadata?.proofSize || 0) / (halo2Proof.metadata?.proofSize || 1)).toFixed(2)}x`);
        console.log('========================================\n');
        
        // 验证性能（两个引擎都应该完成）
        expect(circomTime).toBeGreaterThan(0);
        expect(halo2Time).toBeGreaterThan(0);
        
    }, 300000);  // 300秒超时
});
