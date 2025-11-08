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
        let proofData: Uint8Array;
        let publicSignals: Record<string, string>;
        
        switch (this.circuitType) {
            case CircuitType.SQUARE:
                proofData = await this.generateSquareProof(input);
                publicSignals = this.extractSquarePublicSignals(proofData, input);
                break;
                
            // 其他电路类型（未来扩展）
            default:
                throw new Error(
                    `电路 ${this.circuitType} 的 Halo2 实现尚未完成。\n` +
                    `当前仅支持: SQUARE\n` +
                    `建议: 使用 Circom 引擎代替`
                );
        }
        
        const generationTime = Date.now() - startTime;
        
        if (this.verbose) {
            console.log(`[Halo2] 证明生成成功`);
            console.log(`[Halo2] 耗时: ${generationTime}ms`);
            console.log(`[Halo2] 证明大小: ${proofData.length} bytes`);
        }
        
        return {
            engine: ProofEngine.HALO2,
            circuitType: this.circuitType,
            proof: Array.from(proofData),  // 转为数组便于序列化
            publicSignals,
            metadata: {
                generationTime,
                proofSize: proofData.length,
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
     * 检查是否已初始化
     */
    isInitialized(): boolean {
        return this.wasmLoader.isInitialized();
    }
}
