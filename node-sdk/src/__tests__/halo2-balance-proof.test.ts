/**
 * Halo2 BalanceProof 单引擎测试
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import path from 'path';
import { BalanceProofProver, BalanceProofInput } from '../engines/halo2';

describe('Halo2 BalanceProof - 单引擎测试', () => {
    let prover: BalanceProofProver;
    const wasmPath = path.resolve(__dirname, '../../../rust-prover/pkg');

    beforeAll(async () => {
        prover = new BalanceProofProver(wasmPath, true);
        await prover.init();
    });

    const cases: { name: string; input: BalanceProofInput; expectedSufficient: '0' | '1' }[] = [
        {
            name: '余额充足 (balance > requiredAmount)',
            input: { balance: 5000, salt: '0x3039', accountId: '0x109d2', requiredAmount: 1000 },
            expectedSufficient: '1'
        },
        {
            name: '余额不足 (balance < requiredAmount)',
            input: { balance: 500, salt: '0x3039', accountId: '0x109d2', requiredAmount: 1000 },
            expectedSufficient: '0'
        },
        {
            name: '边界情况 (balance === requiredAmount)',
            input: { balance: 1000, salt: '0x3039', accountId: '0x109d2', requiredAmount: 1000 },
            expectedSufficient: '1'
        }
    ];

    test.each(cases)('%s', async ({ input, expectedSufficient }) => {
        const proof = await prover.generateProof(input);
        expect(proof.engine).toBe('halo2');
        expect(proof.circuitType).toBe('balance_proof');
        if (!Array.isArray(proof.publicSignals) || proof.publicSignals.length !== 2) {
            throw new Error('publicSignals 应该是长度为 2 的数组');
        }
        const publicSignals = proof.publicSignals as [string, string];
        expect(publicSignals[1]).toBe(expectedSufficient);

        const verified = await prover.verifyProof(proof.proof as string, publicSignals);
        expect(verified).toBe(true);
    }, 120000);

    test('64 位边界', async () => {
        const input: BalanceProofInput = {
            balance: Number.MAX_SAFE_INTEGER,
            salt: '0x3039',
            accountId: '0x109d2',
            requiredAmount: 1000
        };

        const proof = await prover.generateProof(input);
        if (!Array.isArray(proof.publicSignals)) {
            throw new Error('publicSignals 应该是数组');
        }
        const publicSignals = proof.publicSignals as [string, string];
        expect(publicSignals[1]).toBe('1');
        expect(await prover.verifyProof(proof.proof as string, publicSignals)).toBe(true);
    }, 120000);

    test('输入验证 - 无效的 balance', async () => {
        const input = { balance: -100, salt: '0x3039', accountId: '0x109d2', requiredAmount: 1000 };
        await expect(prover.generateProof(input as BalanceProofInput)).rejects.toThrow('balance 必须是非负整数');
    });

    test('输入验证 - 无效的 salt', async () => {
        const input = { balance: 5000, salt: 'invalid', accountId: '0x109d2', requiredAmount: 1000 };
        await expect(prover.generateProof(input as BalanceProofInput)).rejects.toThrow('salt 必须是有效的十六进制字符串');
    });

    test('输入验证 - 无效的 accountId', async () => {
        const input = { balance: 5000, salt: '0x3039', accountId: 'not-hex', requiredAmount: 1000 };
        await expect(prover.generateProof(input as BalanceProofInput)).rejects.toThrow('accountId 必须是有效的十六进制字符串');
    });
});
