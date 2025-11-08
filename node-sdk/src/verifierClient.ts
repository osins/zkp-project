import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import * as path from 'path';
import { ProofData, VerificationResult } from './index';

export class VerifierClient {
    private vkeyPath: string;
    private vkey: any;

    constructor(vkeyPath: string = '../circom-circuits/build/verification_key.json') {
        this.vkeyPath = vkeyPath;
        
        if (!fs.existsSync(this.vkeyPath)) {
            throw new Error(`Verification key not found: ${this.vkeyPath}`);
        }

        this.vkey = JSON.parse(fs.readFileSync(this.vkeyPath, 'utf8'));
    }

    /**
     * 链下验证零知识证明
     * @param proofData 证明数据
     * @returns 验证结果
     */
    async verify(proofData: ProofData): Promise<VerificationResult> {
        console.log('🔍 Verifying proof off-chain...');

        try {
            const verified = await snarkjs.groth16.verify(
                this.vkey,
                proofData.publicSignals,
                proofData.proof
            );

            const result: VerificationResult = {
                verified,
                timestamp: Date.now()
            };

            if (verified) {
                console.log('✅ Proof verified successfully!');
            } else {
                console.log('❌ Proof verification failed!');
            }

            return result;
        } catch (error) {
            console.error('❌ Verification error:', error);
            throw error;
        }
    }

    /**
     * 验证公开信号是否匹配预期
     * @param publicSignals 公开信号
     * @param expected 预期值数组
     * @returns 是否匹配
     */
    verifyPublicSignals(publicSignals: string[], expected: string[]): boolean {
        if (publicSignals.length !== expected.length) {
            return false;
        }

        for (let i = 0; i < publicSignals.length; i++) {
            if (publicSignals[i] !== expected[i]) {
                return false;
            }
        }

        return true;
    }

    /**
     * 获取验证密钥信息
     */
    getVerificationKeyInfo(): any {
        return {
            protocol: this.vkey.protocol,
            curve: this.vkey.curve,
            nPublic: this.vkey.nPublic
        };
    }
}
