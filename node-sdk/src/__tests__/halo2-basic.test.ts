/**
 * Halo2 基础功能测试
 */

import { WasmLoader } from '../engines/halo2/WasmLoader';
import * as path from 'path';

describe('Halo2 WASM 基础测试', () => {
    const WASM_PATH = path.resolve(__dirname, '../../../rust-prover/pkg');
    
    test('WASM 加载和初始化', async () => {
        const loader = new WasmLoader(WASM_PATH);
        await loader.init();
        expect(loader.isInitialized()).toBe(true);
    }, 10000);
    
    test('Square 电路 - 生成证明', async () => {
        const loader = new WasmLoader(WASM_PATH);
        await loader.init();
        
        const proof = await loader.generateProof(5);
        expect(proof).toBeInstanceOf(Uint8Array);
        expect(proof.length).toBeGreaterThan(0);
        
        console.log('Square 证明大小:', proof.length, '字节');
    }, 10000);
    
    test('AgeVerification - 生成证明', async () => {
        const loader = new WasmLoader(WASM_PATH);
        await loader.init();
        
        const resultJson = await loader.generateAgeProof(
            25,      // age
            "0x3039", // salt
            18,      // minAge
            65       // maxAge
        );
        
        expect(resultJson).toBeDefined();
        expect(typeof resultJson).toBe('string');
        
        const result = JSON.parse(resultJson);
        expect(result.proof).toBeDefined();
        expect(result.publicSignals).toBeDefined();
        expect(Array.isArray(result.publicSignals)).toBe(true);
        expect(result.publicSignals.length).toBe(2);
        
        console.log('AgeVerification 结果:', {
            proof: result.proof.substring(0, 20) + '...',
            commitment: result.publicSignals[0],
            valid: result.publicSignals[1]
        });
        
        expect(result.publicSignals[1]).toBe("1");
    }, 10000);
});
