/**
 * Halo2 AgeVerification 证明生成器
 * 
 * 接口与 Circom 版本完全一致
 */

import { WasmLoader } from './WasmLoader';
import {
    CircuitInput,
    UnifiedProofData,
    ProofEngine,
    CircuitType
} from '../../types/engines';
import { validateCircuitInput } from '../../utils/validation';

/**
 * AgeVerification 输入接口（与 Circom 严格一致）
 */
export interface AgeVerificationInput {
    /** 实际年龄（私密） */
    age: number;
    
    /** 随机盐值（私密，十六进制字符串） */
    salt: string;
    
    /** 年龄承诺（公开，Poseidon(age, salt)） */
    ageCommitment?: string;
    
    /** 最小年龄（公开） */
    minAge: number;
    
    /** 最大年龄（公开） */
    maxAge: number;
    
    /** 账户ID（私密，可选） */
    accountId?: string;
}

/**
 * AgeVerification 证明结果
 */
export interface AgeVerificationProofData {
    /** 证明数据（十六进制） */
    proof: string;
    
    /** 公开信号 [commitment, valid] */
    publicSignals: [string, string];
}

/**
 * Halo2 AgeVerification 证明生成器
 */
export class AgeVerificationProver {
    private wasmLoader: WasmLoader;
    private verbose: boolean;
    
    constructor(wasmPath: string, verbose: boolean = false) {
        this.wasmLoader = new WasmLoader(wasmPath);
        this.verbose = verbose;
    }
    
    /**
     * 初始化
     */
    async init(): Promise<void> {
        if (this.verbose) {
            console.log('[Halo2] 初始化 AgeVerification 电路...');
        }
        
        await this.wasmLoader.init();
        
        if (this.verbose) {
            console.log('[Halo2] 初始化完成');
        }
    }
    
    /**
     * 生成证明（与 Circom 接口一致）
     */
    async generateProof(input: AgeVerificationInput): Promise<UnifiedProofData> {
        // 验证输入
        this.validateInput(input);
        
        const startTime = Date.now();
        
        if (this.verbose) {
            console.log('[Halo2] 生成 AgeVerification 证明...');
            console.log('[Halo2] 输入:', input);
        }
        
        try {
            // 调用 WASM 接口
            const wasm = this.wasmLoader.getWasm();
            
            // wasm_generate_age_proof(age, salt_str, min_age, max_age)
            const resultJson = wasm.wasm_generate_age_proof(
                input.age,
                input.salt,
                input.minAge,
                input.maxAge
            );
            
            // 解析 JSON 结果
            const result: AgeVerificationProofData = JSON.parse(resultJson);
            
            const generationTime = Date.now() - startTime;
            
            // 计算证明大小
            const proofSize = result.proof.length / 2; // hex 字符串长度 / 2
            
            if (this.verbose) {
                console.log('[Halo2] 证明生成成功');
                console.log('[Halo2] 耗时:', generationTime + 'ms');
                console.log('[Halo2] 证明大小:', proofSize, 'bytes');
                console.log('[Halo2] 公开信号:', result.publicSignals);
            }
            
            return {
                engine: ProofEngine.HALO2,
                circuitType: CircuitType.AGE_VERIFICATION,
                proof: result.proof,
                publicSignals: result.publicSignals,
                metadata: {
                    generationTime,
                    proofSize,
                    timestamp: Date.now()
                }
            };
            
        } catch (error: any) {
            throw new Error(`Halo2 AgeVerification 证明生成失败: ${error.message}`);
        }
    }
    
    /**
     * 验证证明
     */
    async verifyProof(proof: string, publicSignals: [string, string]): Promise<boolean> {
        const startTime = Date.now();
        
        if (this.verbose) {
            console.log('[Halo2] 验证 AgeVerification 证明...');
            console.log('[Halo2] 公开信号:', publicSignals);
        }
        
        try {
            const wasm = this.wasmLoader.getWasm();
            
            // wasm_verify_age_proof(proof_hex, commitment_str, valid_str)
            const verified = wasm.wasm_verify_age_proof(
                proof,
                publicSignals[0],  // commitment
                publicSignals[1]   // valid (0 或 1)
            );
            
            const verificationTime = Date.now() - startTime;
            
            if (this.verbose) {
                console.log('[Halo2] 验证结果:', verified ? '✅ 通过' : '❌ 失败');
                console.log('[Halo2] 验证耗时:', verificationTime + 'ms');
            }
            
            return verified;
            
        } catch (error: any) {
            throw new Error(`Halo2 AgeVerification 证明验证失败: ${error.message}`);
        }
    }
    
    /**
     * 验证输入参数
     */
    private validateInput(input: AgeVerificationInput): void {
        // 验证 age
        if (typeof input.age !== 'number' || input.age < 0 || input.age > 255) {
            throw new Error('age 必须是 0-255 的整数');
        }
        
        // 验证 salt
        if (typeof input.salt !== 'string') {
            throw new Error('salt 必须是字符串（十六进制）');
        }
        
        // 验证 minAge
        if (typeof input.minAge !== 'number' || input.minAge < 0) {
            throw new Error('minAge 必须是非负整数');
        }
        
        // 验证 maxAge
        if (typeof input.maxAge !== 'number' || input.maxAge < input.minAge) {
            throw new Error('maxAge 必须 >= minAge');
        }
        
        // 验证范围
        if (input.maxAge > 255) {
            throw new Error('maxAge 不能超过 255');
        }
    }
    
    /**
     * 检查是否已初始化
     */
    isInitialized(): boolean {
        return this.wasmLoader.isInitialized();
    }
}
