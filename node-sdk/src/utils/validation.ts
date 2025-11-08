/**
 * 配置和输入验证工具
 */

import {
    ProofEngine,
    CircuitType,
    ZKPConfig,
    CircuitInput,
    CIRCUIT_ENGINE_COMPATIBILITY
} from '../types/engines';

/**
 * 验证引擎和电路的兼容性
 */
export function validateEngineCircuitCompatibility(
    engine: ProofEngine,
    circuitType: CircuitType
): void {
    const compatibleEngines = CIRCUIT_ENGINE_COMPATIBILITY[circuitType];
    
    if (!compatibleEngines || !compatibleEngines.includes(engine)) {
        const available = compatibleEngines?.join(', ') || 'none';
        throw new Error(
            `电路 "${circuitType}" 不支持引擎 "${engine}"。\n` +
            `可用引擎: ${available}\n` +
            `提示: 查看文档了解电路与引擎的兼容性。`
        );
    }
}

/**
 * 验证 ZKP 配置
 */
export function validateZKPConfig(config: ZKPConfig): void {
    // 验证引擎
    if (!Object.values(ProofEngine).includes(config.engine)) {
        throw new Error(
            `无效的引擎类型: ${config.engine}。` +
            `可用引擎: ${Object.values(ProofEngine).join(', ')}`
        );
    }
    
    // 验证电路类型
    if (!Object.values(CircuitType).includes(config.circuitType)) {
        throw new Error(
            `无效的电路类型: ${config.circuitType}。` +
            `可用电路: ${Object.values(CircuitType).join(', ')}`
        );
    }
    
    // 验证兼容性
    validateEngineCircuitCompatibility(config.engine, config.circuitType);
    
    // Circom 引擎特定验证
    if (config.engine === ProofEngine.CIRCOM) {
        if (!config.buildDir) {
            throw new Error(
                'Circom 引擎需要 buildDir 配置。\n' +
                '示例: { engine: ProofEngine.CIRCOM, buildDir: "../circom-circuits/build" }'
            );
        }
    }
    
    // Halo2 引擎特定验证
    if (config.engine === ProofEngine.HALO2) {
        if (!config.wasmPath) {
            throw new Error(
                'Halo2 引擎需要 wasmPath 配置。\n' +
                '示例: { engine: ProofEngine.HALO2, wasmPath: "../rust-prover/pkg" }'
            );
        }
    }
}

/**
 * 验证电路输入（根据电路类型）
 */
export function validateCircuitInput(
    circuitType: CircuitType,
    input: CircuitInput
): void {
    const validators: Record<CircuitType, (input: CircuitInput) => void> = {
        [CircuitType.EXAMPLE]: validateExampleInput,
        [CircuitType.SQUARE]: validateSquareInput,
        [CircuitType.RANGE_PROOF]: validateRangeProofInput,
        [CircuitType.MERKLE_PROOF]: validateMerkleProofInput,
        [CircuitType.AGE_VERIFICATION]: validateAgeVerificationInput,
        [CircuitType.BALANCE_PROOF]: validateBalanceProofInput,
        [CircuitType.VOTING]: validateVotingInput
    };
    
    const validator = validators[circuitType];
    if (!validator) {
        throw new Error(`未找到电路 ${circuitType} 的输入验证器`);
    }
    
    validator(input);
}

// ===== 各电路的输入验证 =====

function validateExampleInput(input: CircuitInput): void {
    if (typeof input.a !== 'number' || typeof input.b !== 'number') {
        throw new Error('Example 电路需要输入: { a: number, b: number }');
    }
}

function validateSquareInput(input: CircuitInput): void {
    if (typeof input.x !== 'number') {
        throw new Error('Square 电路需要输入: { x: number }');
    }
    if (input.x < 0 || input.x > 255) {
        throw new Error('Square 电路 x 必须在 [0, 255] 范围内');
    }
}

function validateRangeProofInput(input: CircuitInput): void {
    const requiredFields = ['value', 'min', 'max'];
    for (const field of requiredFields) {
        if (!(field in input)) {
            throw new Error(
                `RangeProof 电路需要输入: { value: number, min: number, max: number }`
            );
        }
    }
    
    const { value, min, max } = input;
    if (typeof value !== 'number' || typeof min !== 'number' || typeof max !== 'number') {
        throw new Error('RangeProof 输入必须都是 number 类型');
    }
    
    if (min >= max) {
        throw new Error('RangeProof min 必须小于 max');
    }
}

function validateMerkleProofInput(input: CircuitInput): void {
    const requiredFields = ['leaf', 'pathElements', 'pathIndices'];
    for (const field of requiredFields) {
        if (!(field in input)) {
            throw new Error(
                `MerkleProof 电路需要输入: ` +
                `{ leaf: string, pathElements: string[], pathIndices: number[] }`
            );
        }
    }
}

function validateAgeVerificationInput(input: CircuitInput): void {
    const requiredFields = ['age', 'minAge', 'maxAge'];
    for (const field of requiredFields) {
        if (!(field in input)) {
            throw new Error(
                `AgeVerification 电路需要输入: ` +
                `{ age: number, minAge: number, maxAge: number }`
            );
        }
    }
    
    const { age, minAge, maxAge } = input;
    if (typeof age !== 'number' || typeof minAge !== 'number' || typeof maxAge !== 'number') {
        throw new Error('AgeVerification 输入必须都是 number 类型');
    }
    
    if (minAge >= maxAge) {
        throw new Error('AgeVerification minAge 必须小于 maxAge');
    }
}

function validateBalanceProofInput(input: CircuitInput): void {
    const requiredFields = ['balance', 'minBalance'];
    for (const field of requiredFields) {
        if (!(field in input)) {
            throw new Error(
                `BalanceProof 电路需要输入: ` +
                `{ balance: number, minBalance: number }`
            );
        }
    }
}

function validateVotingInput(input: CircuitInput): void {
    const requiredFields = ['vote', 'voterSecret'];
    for (const field of requiredFields) {
        if (!(field in input)) {
            throw new Error(
                `Voting 电路需要输入: ` +
                `{ vote: number, voterSecret: string }`
            );
        }
    }
}

/**
 * 检查是否支持链上验证
 */
export function supportsOnChainVerification(engine: ProofEngine): boolean {
    return engine === ProofEngine.CIRCOM;
}
