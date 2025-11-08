/**
 * 双引擎 ZKP 类型定义
 * 
 * 支持：
 * - Circom (Groth16) - 链上验证
 * - Halo2 (Rust) - 链下验证，无可信设置
 */

/**
 * 证明引擎类型
 */
export enum ProofEngine {
    /** Circom + SnarkJS + Groth16 - 支持链上验证 */
    CIRCOM = 'circom',
    
    /** Rust + Halo2 - 链下验证，无可信设置 */
    HALO2 = 'halo2'
}

/**
 * 电路类型（跨引擎）
 */
export enum CircuitType {
    // ===== 示例电路 =====
    /** 示例：乘法器 (仅 Circom) */
    EXAMPLE = 'example',
    
    /** 示例：平方电路 (仅 Halo2) */
    SQUARE = 'square',
    
    // ===== 生产电路 =====
    /** 范围证明 (Circom + Halo2) */
    RANGE_PROOF = 'range_proof',
    
    /** 默克尔树证明 (Circom + Halo2) */
    MERKLE_PROOF = 'merkle_proof',
    
    /** 年龄验证 (Circom + Halo2) */
    AGE_VERIFICATION = 'age_verification',
    
    /** 余额证明 (Circom + Halo2) */
    BALANCE_PROOF = 'balance_proof',
    
    /** 投票电路 (Circom + Halo2) */
    VOTING = 'voting'
}

/**
 * 电路输入（通用格式）
 */
export interface CircuitInput {
    [key: string]: number | string | bigint | number[] | string[];
}

/**
 * 统一的证明数据格式
 */
export interface UnifiedProofData {
    /** 使用的引擎 */
    engine: ProofEngine;
    
    /** 电路类型 */
    circuitType: CircuitType;
    
    /** 证明数据（引擎特定格式） */
    proof: any;
    
    /** 公开信号/公开输入 */
    publicSignals: string[] | Record<string, string>;
    
    /** 元数据 */
    metadata?: {
        /** 生成时间（毫秒） */
        generationTime?: number;
        
        /** 证明大小（字节） */
        proofSize?: number;
        
        /** 验证时间（毫秒） */
        verificationTime?: number;
        
        /** 其他自定义字段 */
        [key: string]: any;
    };
}

/**
 * 验证结果
 */
export interface VerificationResult {
    /** 验证是否通过 */
    verified: boolean;
    
    /** 验证时间戳 */
    timestamp: number;
    
    /** 验证耗时（毫秒） */
    duration?: number;
    
    /** 错误信息（如果验证失败） */
    error?: string;
}

/**
 * ZKP 客户端配置
 */
export interface ZKPConfig {
    /** 使用的证明引擎 */
    engine: ProofEngine;
    
    /** 电路类型 */
    circuitType: CircuitType;
    
    /** Circom 构建目录（仅 Circom 引擎需要） */
    buildDir?: string;
    
    /** Rust WASM 路径（仅 Halo2 引擎需要） */
    wasmPath?: string;
    
    /** 是否启用详细日志 */
    verbose?: boolean;
}

/**
 * 电路信息
 */
export interface CircuitInfo {
    /** 电路名称 */
    name: string;
    
    /** 电路类型 */
    type: CircuitType;
    
    /** 使用的引擎 */
    engine: ProofEngine;
    
    /** 是否支持链上验证 */
    supportsOnChainVerification: boolean;
    
    /** 是否需要可信设置 */
    requiresTrustedSetup: boolean;
    
    /** 输入字段说明 */
    inputFields: {
        name: string;
        type: string;
        required: boolean;
        description?: string;
    }[];
    
    /** 公开信号说明 */
    publicSignals: {
        name: string;
        description?: string;
    }[];
}

/**
 * 引擎能力
 */
export interface EngineCapabilities {
    /** 引擎名称 */
    name: string;
    
    /** 证明系统 */
    proofSystem: string;
    
    /** 椭圆曲线 */
    curve: string;
    
    /** 支持链上验证 */
    onChainVerification: boolean;
    
    /** 需要可信设置 */
    trustedSetup: boolean;
    
    /** 平均证明大小（字节） */
    avgProofSize: number;
    
    /** 平均生成时间（毫秒） */
    avgGenerationTime: number;
    
    /** 平均验证时间（毫秒） */
    avgVerificationTime: number;
}

/**
 * 电路与引擎的兼容性映射
 */
export const CIRCUIT_ENGINE_COMPATIBILITY: Record<CircuitType, ProofEngine[]> = {
    // 示例电路
    [CircuitType.EXAMPLE]: [ProofEngine.CIRCOM],
    [CircuitType.SQUARE]: [ProofEngine.HALO2],
    
    // 生产电路（Circom 完整实现，Halo2 部分实现）
    [CircuitType.RANGE_PROOF]: [ProofEngine.CIRCOM, ProofEngine.HALO2],
    [CircuitType.MERKLE_PROOF]: [ProofEngine.CIRCOM],  // Halo2 仅基础框架
    [CircuitType.AGE_VERIFICATION]: [ProofEngine.CIRCOM],  // Halo2 仅基础框架
    [CircuitType.BALANCE_PROOF]: [ProofEngine.CIRCOM],  // Halo2 仅基础框架
    [CircuitType.VOTING]: [ProofEngine.CIRCOM]  // Halo2 仅基础框架
};

/**
 * 引擎能力常量
 */
export const ENGINE_CAPABILITIES: Record<ProofEngine, EngineCapabilities> = {
    [ProofEngine.CIRCOM]: {
        name: 'Circom (Groth16)',
        proofSystem: 'Groth16',
        curve: 'BN128 (alt_bn128)',
        onChainVerification: true,
        trustedSetup: true,
        avgProofSize: 250,  // bytes
        avgGenerationTime: 200,  // ms
        avgVerificationTime: 13  // ms
    },
    [ProofEngine.HALO2]: {
        name: 'Rust (Halo2)',
        proofSystem: 'PLONK/Halo2',
        curve: 'Pasta (Pallas/Vesta)',
        onChainVerification: false,
        trustedSetup: false,
        avgProofSize: 1300,  // bytes
        avgGenerationTime: 840,  // ms
        avgVerificationTime: 600  // ms
    }
};
