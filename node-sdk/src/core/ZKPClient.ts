/**
 * 统一的 ZKP 客户端
 * 
 * 支持双引擎：
 * - Circom (Groth16) - 链上验证
 * - Halo2 (Rust) - 链下验证，无可信设置
 */

import {
    ZKPConfig,
    CircuitInput,
    UnifiedProofData,
    VerificationResult,
    CircuitInfo,
    ProofEngine,
    CircuitType,
    ENGINE_CAPABILITIES
} from '../types/engines';
import { validateZKPConfig, supportsOnChainVerification } from '../utils/validation';
import { CircomProver } from '../engines/circom/CircomProver';
import { CircomVerifier } from '../engines/circom/CircomVerifier';
import { RustProver } from '../engines/halo2/RustProver';
import { RustVerifier } from '../engines/halo2/RustVerifier';
import * as snarkjs from 'snarkjs';
import * as fs from 'fs';

/**
 * 统一的 ZKP 客户端
 */
export class ZKPClient {
    private config: ZKPConfig;
    private circomProver?: CircomProver;
    private circomVerifier?: CircomVerifier;
    private rustProver?: RustProver;
    private rustVerifier?: RustVerifier;
    private initialized: boolean = false;
    
    constructor(config: ZKPConfig) {
        // 验证配置
        validateZKPConfig(config);
        this.config = config;
    }
    
    /**
     * 初始化客户端
     */
    async init(): Promise<void> {
        if (this.initialized) {
            return;
        }
        
        if (this.config.verbose) {
            console.log(`\n========================================`);
            console.log(`ZKP Client 初始化`);
            console.log(`========================================`);
            console.log(`引擎: ${this.config.engine}`);
            console.log(`电路: ${this.config.circuitType}`);
            console.log(`========================================\n`);
        }
        
        // 根据引擎类型初始化
        if (this.config.engine === ProofEngine.CIRCOM) {
            await this.initCircomEngine();
        } else if (this.config.engine === ProofEngine.HALO2) {
            await this.initHalo2Engine();
        }
        
        this.initialized = true;
        
        if (this.config.verbose) {
            console.log(`✅ ZKP Client 初始化完成\n`);
        }
    }
    
    /**
     * 初始化 Circom 引擎
     */
    private async initCircomEngine(): Promise<void> {
        if (!this.config.buildDir) {
            throw new Error('Circom 引擎需要 buildDir 配置');
        }
        
        // 验证构建目录存在
        if (!fs.existsSync(this.config.buildDir)) {
            throw new Error(
                `Circom 构建目录不存在: ${this.config.buildDir}\n` +
                `请确保已构建 Circom 电路:\n` +
                `  cd circom-circuits && ./scripts/build_production.sh`
            );
        }
        
        this.circomProver = new CircomProver(
            this.config.buildDir,
            this.config.circuitType,
            this.config.verbose
        );
        
        this.circomVerifier = new CircomVerifier(
            this.config.buildDir,
            this.config.circuitType,
            this.config.verbose
        );
    }
    
    /**
     * 初始化 Halo2 引擎
     */
    private async initHalo2Engine(): Promise<void> {
        if (!this.config.wasmPath) {
            throw new Error('Halo2 引擎需要 wasmPath 配置');
        }
        
        this.rustProver = new RustProver(
            this.config.wasmPath,
            this.config.circuitType,
            this.config.verbose
        );
        
        this.rustVerifier = new RustVerifier(
            this.config.wasmPath,
            this.config.circuitType,
            this.config.verbose
        );
        
        // 初始化 WASM
        await this.rustProver.init();
        await this.rustVerifier.init();
    }
    
    /**
     * 生成证明
     */
    async generateProof(input: CircuitInput): Promise<UnifiedProofData> {
        if (!this.initialized) {
            await this.init();
        }
        
        if (this.config.engine === ProofEngine.CIRCOM) {
            if (!this.circomProver) {
                throw new Error('Circom 证明器未初始化');
            }
            return await this.circomProver.generateProof(input);
            
        } else if (this.config.engine === ProofEngine.HALO2) {
            if (!this.rustProver) {
                throw new Error('Halo2 证明器未初始化');
            }
            return await this.rustProver.generateProof(input);
            
        } else {
            throw new Error(`不支持的引擎: ${this.config.engine}`);
        }
    }
    
    /**
     * 验证证明
     */
    async verify(proofData: UnifiedProofData): Promise<VerificationResult> {
        if (!this.initialized) {
            await this.init();
        }
        
        if (this.config.engine === ProofEngine.CIRCOM) {
            if (!this.circomVerifier) {
                throw new Error('Circom 验证器未初始化');
            }
            return await this.circomVerifier.verify(proofData);
            
        } else if (this.config.engine === ProofEngine.HALO2) {
            if (!this.rustVerifier) {
                throw new Error('Halo2 验证器未初始化');
            }
            return await this.rustVerifier.verify(proofData);
            
        } else {
            throw new Error(`不支持的引擎: ${this.config.engine}`);
        }
    }
    
    /**
     * 导出 Solidity 调用数据（仅 Circom 支持）
     */
    async exportSolidityCallData(proofData: UnifiedProofData): Promise<string> {
        if (!supportsOnChainVerification(this.config.engine)) {
            throw new Error(
                `引擎 ${this.config.engine} 不支持链上验证。\n` +
                `提示: 仅 Circom 引擎支持导出 Solidity calldata。\n` +
                `Halo2 证明无法在 EVM 上验证（椭圆曲线不兼容）。\n\n` +
                `解决方案:\n` +
                `1. 使用 Circom 引擎（支持链上验证）\n` +
                `2. 链下验证 Halo2 证明，然后签发链上凭证`
            );
        }
        
        // Circom 证明的 publicSignals 必须是 string[]
        const publicSignals = Array.isArray(proofData.publicSignals) 
            ? proofData.publicSignals 
            : Object.values(proofData.publicSignals);
        
        // 使用 snarkjs 导出 calldata
        const calldata = await snarkjs.groth16.exportSolidityCallData(
            proofData.proof,
            publicSignals
        );
        
        return calldata;
    }
    
    /**
     * 获取电路信息
     */
    getCircuitInfo(): CircuitInfo {
        const capabilities = ENGINE_CAPABILITIES[this.config.engine];
        
        // 根据电路类型返回详细信息
        const circuitInfoMap: Record<CircuitType, Omit<CircuitInfo, 'engine' | 'supportsOnChainVerification' | 'requiresTrustedSetup'>> = {
            [CircuitType.EXAMPLE]: {
                name: 'Example Multiplier',
                type: CircuitType.EXAMPLE,
                inputFields: [
                    { name: 'a', type: 'number', required: true, description: '第一个乘数' },
                    { name: 'b', type: 'number', required: true, description: '第二个乘数' }
                ],
                publicSignals: [
                    { name: 'c', description: 'a * b 的结果' }
                ]
            },
            [CircuitType.SQUARE]: {
                name: 'Square Circuit',
                type: CircuitType.SQUARE,
                inputFields: [
                    { name: 'x', type: 'number', required: true, description: '输入值 (0-255)' }
                ],
                publicSignals: [
                    { name: 'y', description: 'x^2 的结果' }
                ]
            },
            [CircuitType.RANGE_PROOF]: {
                name: 'Range Proof',
                type: CircuitType.RANGE_PROOF,
                inputFields: [
                    { name: 'value', type: 'number', required: true, description: '要证明的值' },
                    { name: 'min', type: 'number', required: true, description: '最小值' },
                    { name: 'max', type: 'number', required: true, description: '最大值' }
                ],
                publicSignals: [
                    { name: 'isInRange', description: '是否在范围内' }
                ]
            },
            [CircuitType.MERKLE_PROOF]: {
                name: 'Merkle Proof',
                type: CircuitType.MERKLE_PROOF,
                inputFields: [
                    { name: 'leaf', type: 'string', required: true, description: '叶子节点' },
                    { name: 'pathElements', type: 'string[]', required: true, description: '路径元素' },
                    { name: 'pathIndices', type: 'number[]', required: true, description: '路径索引' }
                ],
                publicSignals: [
                    { name: 'root', description: 'Merkle 根' }
                ]
            },
            [CircuitType.AGE_VERIFICATION]: {
                name: 'Age Verification',
                type: CircuitType.AGE_VERIFICATION,
                inputFields: [
                    { name: 'age', type: 'number', required: true, description: '年龄' },
                    { name: 'minAge', type: 'number', required: true, description: '最小年龄' },
                    { name: 'maxAge', type: 'number', required: true, description: '最大年龄' }
                ],
                publicSignals: [
                    { name: 'isValid', description: '年龄是否有效' }
                ]
            },
            [CircuitType.BALANCE_PROOF]: {
                name: 'Balance Proof',
                type: CircuitType.BALANCE_PROOF,
                inputFields: [
                    { name: 'balance', type: 'number', required: true, description: '余额' },
                    { name: 'minBalance', type: 'number', required: true, description: '最小余额' }
                ],
                publicSignals: [
                    { name: 'isSufficient', description: '余额是否充足' }
                ]
            },
            [CircuitType.VOTING]: {
                name: 'Voting Circuit',
                type: CircuitType.VOTING,
                inputFields: [
                    { name: 'vote', type: 'number', required: true, description: '投票选项' },
                    { name: 'voterSecret', type: 'string', required: true, description: '投票者密钥' }
                ],
                publicSignals: [
                    { name: 'commitment', description: '投票承诺' }
                ]
            }
        };
        
        const baseInfo = circuitInfoMap[this.config.circuitType];
        
        return {
            ...baseInfo,
            engine: this.config.engine,
            supportsOnChainVerification: capabilities.onChainVerification,
            requiresTrustedSetup: capabilities.trustedSetup
        };
    }
    
    /**
     * 检查是否支持链上验证
     */
    canVerifyOnChain(): boolean {
        return supportsOnChainVerification(this.config.engine);
    }
    
    /**
     * 获取引擎能力信息
     */
    getEngineCapabilities() {
        return ENGINE_CAPABILITIES[this.config.engine];
    }
    
    /**
     * 保存证明到文件
     */
    saveProof(proofData: UnifiedProofData, filePath: string): void {
        const data = JSON.stringify(proofData, null, 2);
        fs.writeFileSync(filePath, data, 'utf-8');
        
        if (this.config.verbose) {
            console.log(`✅ 证明已保存到: ${filePath}`);
        }
    }
    
    /**
     * 从文件加载证明
     */
    static loadProof(filePath: string): UnifiedProofData {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data) as UnifiedProofData;
    }
}
