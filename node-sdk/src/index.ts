// ===== 双引擎 ZKP 统一接口 =====
export { ZKPClient } from './core/ZKPClient';

// 类型定义
export {
    ProofEngine,
    CircuitType,
    ZKPConfig,
    CircuitInput,
    UnifiedProofData,
    VerificationResult,
    CircuitInfo,
    EngineCapabilities,
    CIRCUIT_ENGINE_COMPATIBILITY,
    ENGINE_CAPABILITIES
} from './types/engines';

// ===== 向后兼容的 Legacy 接口 =====
export { ProverClient } from './proverClient';
export { VerifierClient } from './verifierClient';
export { ContractClient } from './contractClient';

// Legacy 类型（向后兼容）
export interface ProofData {
    proof: any;
    publicSignals: string[];
}
