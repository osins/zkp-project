/**
 * Circom Groth16 证明生成器（封装现有实现）
 */

import { ProverClient } from '../../proverClient';
import {
    CircuitInput,
    UnifiedProofData,
    ProofEngine,
    CircuitType
} from '../../types/engines';
import { validateCircuitInput } from '../../utils/validation';

/**
 * Circom 证明生成器
 */
export class CircomProver {
    private proverClient: ProverClient;
    private circuitType: CircuitType;
    private verbose: boolean;
    
    constructor(buildDir: string, circuitType: CircuitType, verbose: boolean = false) {
        // 获取电路名称
        const circuitName = this.getCircuitName(circuitType);
        
        // ProverClient 接受 (circuitName, buildDir) 两个参数
        this.proverClient = new ProverClient(circuitName, buildDir);
        this.circuitType = circuitType;
        this.verbose = verbose;
    }
    
    /**
     * 获取电路名称（根据电路类型）
     */
    private getCircuitName(circuitType: CircuitType): string {
        const circuitNames: Record<CircuitType, string> = {
            [CircuitType.EXAMPLE]: 'example',
            [CircuitType.RANGE_PROOF]: 'range_proof',
            [CircuitType.MERKLE_PROOF]: 'merkle_proof',
            [CircuitType.AGE_VERIFICATION]: 'age_verification',
            [CircuitType.BALANCE_PROOF]: 'balance_proof',
            [CircuitType.VOTING]: 'voting_circuit',
            [CircuitType.SQUARE]: ''  // 不支持
        };
        
        const circuitName = circuitNames[circuitType];
        if (!circuitName) {
            throw new Error(`电路 ${circuitType} 不支持 Circom 引擎`);
        }
        
        return circuitName;
    }
    
    /**
     * 生成证明
     */
    async generateProof(input: CircuitInput): Promise<UnifiedProofData> {
        // 验证输入
        validateCircuitInput(this.circuitType, input);
        
        const startTime = Date.now();
        
        if (this.verbose) {
            console.log(`[Circom] 生成证明...`);
            console.log(`[Circom] 电路: ${this.circuitType}`);
            console.log(`[Circom] 输入:`, input);
        }
        
        try {
            // 调用现有的 ProverClient
            const proofData = await this.proverClient.generateProof(input);
            
            const generationTime = Date.now() - startTime;
            
            // 计算证明大小
            const proofSize = JSON.stringify(proofData.proof).length;
            
            if (this.verbose) {
                console.log(`[Circom] 证明生成成功`);
                console.log(`[Circom] 耗时: ${generationTime}ms`);
                console.log(`[Circom] 证明大小: ~${proofSize} bytes`);
            }
            
            return {
                engine: ProofEngine.CIRCOM,
                circuitType: this.circuitType,
                proof: proofData.proof,
                publicSignals: proofData.publicSignals,
                metadata: {
                    generationTime,
                    proofSize,
                    timestamp: Date.now()
                }
            };
            
        } catch (error: any) {
            throw new Error(`Circom 证明生成失败: ${error.message}`);
        }
    }
}
