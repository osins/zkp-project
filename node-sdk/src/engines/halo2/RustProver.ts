/**
 * Rust Halo2 证明生成器
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
 * Halo2 证明生成器
 */
export class RustProver {
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
            console.log(`[Halo2] 初始化 ${this.circuitType} 电路...`);
        }
        
        await this.wasmLoader.init();
        
        if (this.verbose) {
            console.log(`[Halo2] 初始化完成`);
        }
    }
    
    /**
     * 生成证明
     */
    async generateProof(input: CircuitInput): Promise<UnifiedProofData> {
        // 验证输入
        validateCircuitInput(this.circuitType, input);
        
        const startTime = Date.now();
        
        if (this.verbose) {
            console.log(`[Halo2] 生成证明...`);
            console.log(`[Halo2] 输入:`, input);
        }
        
        // 根据电路类型处理输入
        let proofData: Uint8Array | string;
        let publicSignals: Record<string, string> | string[];
        
        switch (this.circuitType) {
            case CircuitType.SQUARE:
                proofData = await this.generateSquareProof(input);
                publicSignals = this.extractSquarePublicSignals(proofData as Uint8Array, input);
                break;
                
            case CircuitType.AGE_VERIFICATION:
                const ageResult = await this.generateAgeVerificationProof(input);
                proofData = ageResult.proof;
                publicSignals = ageResult.publicSignals;
                break;
                
            // 其他电路类型（未来扩展）
            default:
                throw new Error(
                    `电路 ${this.circuitType} 的 Halo2 实现尚未完成。\n` +
                    `当前支持: SQUARE, AGE_VERIFICATION\n` +
                    `建议: 使用 Circom 引擎代替`
                );
        }
        
        const generationTime = Date.now() - startTime;
        
        if (this.verbose) {
            console.log(`[Halo2] 证明生成成功`);
            console.log(`[Halo2] 耗时: ${generationTime}ms`);
            console.log(`[Halo2] 证明大小: ${proofData.length} bytes`);
        }
        
        // 计算证明大小
        const proofSize = typeof proofData === 'string' 
            ? proofData.length / 2  // hex 字符串
            : proofData.length;     // Uint8Array
        
        return {
            engine: ProofEngine.HALO2,
            circuitType: this.circuitType,
            proof: typeof proofData === 'string' ? proofData : Array.from(proofData),
            publicSignals,
            metadata: {
                generationTime,
                proofSize,
                timestamp: Date.now()
            }
        };
    }
    
    /**
     * 生成 Square 电路证明
     */
    private async generateSquareProof(input: CircuitInput): Promise<Uint8Array> {
        const x = Number(input.x);
        
        if (x < 0 || x > 255) {
            throw new Error('Square 电路 x 必须在 [0, 255] 范围内');
        }
        
        return await this.wasmLoader.generateProof(x);
    }
    
    /**
     * 提取 Square 电路的公开信号
     */
    private extractSquarePublicSignals(
        proofData: Uint8Array,
        input: CircuitInput
    ): Record<string, string> {
        // Halo2 Square 电路的公开输出是 y = x^2
        // 从 proofData 的前 32 字节提取 y
        const yBytes = proofData.slice(0, 32);
        
        // 转为 hex 字符串
        const yHex = Array.from(yBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        
        const x = Number(input.x);
        const yExpected = x * x;
        
        return {
            x: x.toString(),
            y: yExpected.toString(),
            y_hex: yHex
        };
    }
    
    /**
     * 生成 AgeVerification 电路证明
     */
    private async generateAgeVerificationProof(input: CircuitInput): Promise<{
        proof: string;
        publicSignals: string[];
    }> {
        // 验证必要参数
        if (!input.age || !input.salt || !input.minAge || !input.maxAge) {
            throw new Error('AgeVerification 电路需要: age, salt, minAge, maxAge');
        }
        
        const age = Number(input.age);
        const minAge = Number(input.minAge);
        const maxAge = Number(input.maxAge);
        const salt = String(input.salt);
        
        // 调用 WasmLoader 的 generateAgeProof 方法
        const resultJson = await this.wasmLoader.generateAgeProof(
            age,
            salt,
            minAge,
            maxAge
        );
        
        // 解析 JSON 结果
        const result = JSON.parse(resultJson);
        
        return {
            proof: result.proof,
            publicSignals: result.publicSignals
        };
    }
    
    /**
     * 检查是否已初始化
     */
    isInitialized(): boolean {
        return this.wasmLoader.isInitialized();
    }
}
