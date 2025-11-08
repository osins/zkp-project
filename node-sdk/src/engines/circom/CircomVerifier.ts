/**
 * Circom Groth16 证明验证器（封装现有实现）
 */

import { VerifierClient } from '../../verifierClient';
import * as path from 'path';
import {
    UnifiedProofData,
    VerificationResult,
    ProofEngine,
    CircuitType
} from '../../types/engines';

/**
 * Circom 证明验证器
 */
export class CircomVerifier {
    private verifierClient: VerifierClient;
    private circuitType: CircuitType;
    private verbose: boolean;
    
    constructor(buildDir: string, circuitType: CircuitType, verbose: boolean = false) {
        // 构造验证密钥路径
        const vkeyPath = this.getVerificationKeyPath(buildDir, circuitType);
        
        // VerifierClient 接受完整的 vkeyPath
        this.verifierClient = new VerifierClient(vkeyPath);
        this.circuitType = circuitType;
        this.verbose = verbose;
    }
    
    /**
     * 获取验证密钥路径
     */
    private getVerificationKeyPath(buildDir: string, circuitType: CircuitType): string {
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
        
        // Example 电路的 vkey 在 build 根目录
        if (circuitType === CircuitType.EXAMPLE) {
            return path.join(buildDir, 'verification_key.json');
        }
        
        // 其他电路在各自的子目录
        return path.join(buildDir, 'production', circuitName, 'verification_key.json');
    }
    
    /**
     * 验证证明
     */
    async verify(proofData: UnifiedProofData): Promise<VerificationResult> {
        // 验证引擎类型
        if (proofData.engine !== ProofEngine.CIRCOM) {
            throw new Error(
                `证明引擎不匹配: 期望 ${ProofEngine.CIRCOM}, 实际 ${proofData.engine}`
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
            console.log(`[Circom] 验证证明...`);
            console.log(`[Circom] 电路: ${this.circuitType}`);
        }
        
        try {
            // 调用现有的 VerifierClient
            const result = await this.verifierClient.verify({
                proof: proofData.proof,
                publicSignals: proofData.publicSignals as string[]
            });
            
            const duration = Date.now() - startTime;
            
            if (this.verbose) {
                console.log(`[Circom] 验证${result.verified ? '成功' : '失败'}`);
                console.log(`[Circom] 耗时: ${duration}ms`);
            }
            
            return {
                verified: result.verified,
                timestamp: result.timestamp,
                duration
            };
            
        } catch (error: any) {
            const duration = Date.now() - startTime;
            
            if (this.verbose) {
                console.error(`[Circom] 验证错误:`, error.message);
            }
            
            return {
                verified: false,
                timestamp: Date.now(),
                duration,
                error: error.message
            };
        }
    }
}
