/**
 * Halo2 BalanceProof 证明生成器
 * 
 * 接口与 Circom 版本完全一致
 */

import { WasmLoader, BalanceProofWasmResult } from './WasmLoader';
import {
    UnifiedProofData,
    ProofEngine,
    CircuitType
} from '../../types/engines';

export interface BalanceProofInput {
    balance: number;
    salt: string;
    accountId: string;
    requiredAmount: number;
}

export class BalanceProofProver {
    private wasmLoader: WasmLoader;
    private verbose: boolean;
    
    constructor(wasmPath: string, verbose: boolean = false) {
        this.wasmLoader = new WasmLoader(wasmPath);
        this.verbose = verbose;
    }
    
    async init(): Promise<void> {
        if (this.verbose) {
            console.log('[Halo2] 初始化 BalanceProof 电路...');
        }
 
        await this.wasmLoader.init();
 
        if (this.verbose) {
            console.log('[Halo2] 初始化完成');
        }
    }
 
    async generateProof(input: BalanceProofInput): Promise<UnifiedProofData> {
        this.validateInput(input);
        const salt = this.normalizeHex(input.salt);
        const accountId = this.normalizeHex(input.accountId);
        const startTime = Date.now();
 
        if (this.verbose) {
            console.log('[Halo2] 生成 BalanceProof 证明...');
            console.log('[Halo2] 输入:', {
                balance: input.balance,
                salt: salt.substring(0, 10) + '...',
                accountId: accountId.substring(0, 10) + '...',
                requiredAmount: input.requiredAmount
            });
        }
 
        try {
            const wasmResult: BalanceProofWasmResult = await this.wasmLoader.generateBalanceProof(
                BigInt(input.balance),
                salt,
                accountId,
                BigInt(input.requiredAmount)
            );
 
            const generationTime = Date.now() - startTime;
            const proofSize = (wasmResult.proof.length - 2) / 2; // hex 字符串长度 / 2
            const sufficient = wasmResult.publicSignals[1] === '1';
 
            if (this.verbose) {
                console.log('[Halo2] 证明生成成功');
                console.log('[Halo2] 耗时:', generationTime + 'ms');
                console.log('[Halo2] 证明大小:', proofSize, 'bytes');
                console.log('[Halo2] 公开信号:', wasmResult.publicSignals);
            }
 
            return {
                engine: ProofEngine.HALO2,
                circuitType: CircuitType.BALANCE_PROOF,
                proof: wasmResult.proof,
                publicSignals: wasmResult.publicSignals,
                metadata: {
                    generationTime,
                    proofSize,
                    timestamp: Date.now(),
                    sufficient
                }
            };
 
        } catch (error: any) {
            throw new Error(`Halo2 BalanceProof 证明生成失败: ${error.message}`);
        }
    }
 
    async verifyProof(proofHex: string, publicSignals: [string, string]): Promise<boolean> {
        const startTime = Date.now();
 
        if (this.verbose) {
            console.log('[Halo2] 验证 BalanceProof 证明...');
            console.log('[Halo2] 公开信号:', publicSignals);
        }
 
        try {
            const encodedBuffer = this.wasmLoader.encodeBalanceProof(
                proofHex,
                publicSignals[0],
                publicSignals[1]
            );
 
            const verified = await this.wasmLoader.verifyBalanceProofBuffer(encodedBuffer);
            const verificationTime = Date.now() - startTime;
 
            if (this.verbose) {
                console.log('[Halo2] 验证结果:', verified ? '✅ 通过' : '❌ 失败');
                console.log('[Halo2] 验证耗时:', verificationTime + 'ms');
            }
 
            return verified;
 
        } catch (error: any) {
            throw new Error(`Halo2 BalanceProof 证明验证失败: ${error.message}`);
        }
    }
 
    private validateInput(input: BalanceProofInput): void {
        const MAX_U64 = BigInt('18446744073709551615');
        if (typeof input.balance !== 'number' || input.balance < 0) {
            throw new Error('balance 必须是非负整数');
        }
        if (BigInt(input.balance) > MAX_U64) {
            throw new Error('balance 超过 u64 最大值');
        }
        if (typeof input.salt !== 'string' || !input.salt.match(/^(0x)?[0-9a-fA-F]+$/)) {
            throw new Error('salt 必须是有效的十六进制字符串');
        }
        if (typeof input.accountId !== 'string' || !input.accountId.match(/^(0x)?[0-9a-fA-F]+$/)) {
            throw new Error('accountId 必须是有效的十六进制字符串');
        }
        if (typeof input.requiredAmount !== 'number' || input.requiredAmount < 0) {
            throw new Error('requiredAmount 必须是非负整数');
        }
        if (BigInt(input.requiredAmount) > MAX_U64) {
            throw new Error('requiredAmount 超过 u64 最大值');
        }
    }
 
    private normalizeHex(hex: string): string {
        let cleaned = hex.toLowerCase().replace(/^0x/, '');
        if (cleaned.length === 0) {
            cleaned = '0';
        }
        if (cleaned.length % 2 !== 0) {
            cleaned = '0' + cleaned;
        }
        return '0x' + cleaned;
    }
}
