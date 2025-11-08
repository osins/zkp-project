/**
 * Rust Halo2 证明验证器
 */

import { WasmLoader } from './WasmLoader';
import {
    UnifiedProofData,
    VerificationResult,
    ProofEngine,
    CircuitType
} from '../../types/engines';

/**
 * Halo2 证明验证器
 */
export class RustVerifier {
    private wasmLoader: WasmLoader;
    private circuitType: CircuitType;
    private verbose: boolean;
    
    constructor(wasmPath: string, circuitType: CircuitType, verbose: boolean = false) {
        this.wasmLoader = new WasmLoader(wasmPath);
        this.circuitType = circuitType;
        this.verbose = verbose;
    }
    
    /**
     * 初始化
     */
    async init(): Promise<void> {
        if (this.verbose) {
            console.log(`[Halo2] 初始化验证器...`);
        }
        
        await this.wasmLoader.init();
        
        if (this.verbose) {
            console.log(`[Halo2] 验证器初始化完成`);
        }
    }
    
    /**
     * 验证证明
     */
    async verify(proofData: UnifiedProofData): Promise<VerificationResult> {
        // 验证引擎类型
        if (proofData.engine !== ProofEngine.HALO2) {
            throw new Error(
                `证明引擎不匹配: 期望 ${ProofEngine.HALO2}, 实际 ${proofData.engine}`
            );
        }
        
        // 验证电路类型
        if (proofData.circuitType !== this.circuitType) {
            throw new Error(
                `电路类型不匹配: 期望 ${this.circuitType}, 实际 ${proofData.circuitType}`
            );
        }
        
        const startTime = Date.now();
        
        if (this.verbose) {
            console.log(`[Halo2] 验证证明...`);
            console.log(`[Halo2] 电路: ${this.circuitType}`);
        }
        
        try {
            // 将 proof 转回 Uint8Array
            const proofBytes = new Uint8Array(proofData.proof);
            
            // 调用 WASM 验证
            const verified = await this.wasmLoader.verifyProof(proofBytes);
            
            const duration = Date.now() - startTime;
            
            if (this.verbose) {
                console.log(`[Halo2] 验证${verified ? '成功' : '失败'}`);
                console.log(`[Halo2] 耗时: ${duration}ms`);
            }
            
            return {
                verified,
                timestamp: Date.now(),
                duration
            };
            
        } catch (error: any) {
            const duration = Date.now() - startTime;
            
            if (this.verbose) {
                console.error(`[Halo2] 验证错误:`, error.message);
            }
            
            return {
                verified: false,
                timestamp: Date.now(),
                duration,
                error: error.message
            };
        }
    }
    
    /**
     * 检查是否已初始化
     */
    isInitialized(): boolean {
        return this.wasmLoader.isInitialized();
    }
}
