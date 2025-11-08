import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import * as path from 'path';
import { ProofData, CircuitInput } from './index';

export class ProverClient {
    private wasmPath: string;
    private zkeyPath: string;

    constructor(circuitName: string, buildDir: string = '../circom-circuits/build') {
        this.wasmPath = path.join(buildDir, `${circuitName}_js`, `${circuitName}.wasm`);
        this.zkeyPath = path.join(buildDir, `${circuitName}_final.zkey`);

        if (!fs.existsSync(this.wasmPath)) {
            throw new Error(`WASM file not found: ${this.wasmPath}`);
        }
        if (!fs.existsSync(this.zkeyPath)) {
            throw new Error(`zkey file not found: ${this.zkeyPath}`);
        }
    }

    /**
     * 生成零知识证明
     * @param input 电路输入
     * @returns 证明数据（proof + publicSignals）
     */
    async generateProof(input: CircuitInput): Promise<ProofData> {
        console.log('🔐 Generating zero-knowledge proof...');
        console.log('📥 Input:', input);

        try {
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                input,
                this.wasmPath,
                this.zkeyPath
            );

            console.log('✅ Proof generated successfully');
            console.log('📊 Public signals:', publicSignals);

            return { proof, publicSignals };
        } catch (error) {
            console.error('❌ Failed to generate proof:', error);
            throw error;
        }
    }

    /**
     * 生成 Solidity calldata（用于链上验证）
     * @param proofData 证明数据
     * @returns Solidity calldata 字符串
     */
    async exportSolidityCallData(proofData: ProofData): Promise<string> {
        const calldata = await snarkjs.groth16.exportSolidityCallData(
            proofData.proof,
            proofData.publicSignals
        );
        return calldata;
    }

    /**
     * 计算 witness
     * @param input 电路输入
     * @param outputPath witness 输出路径
     */
    async calculateWitness(input: CircuitInput, outputPath: string): Promise<void> {
        await snarkjs.wtns.calculate(input, this.wasmPath, outputPath);
        console.log(`✅ Witness saved to ${outputPath}`);
    }

    /**
     * 保存证明到文件
     * @param proofData 证明数据
     * @param outputPath 输出路径
     */
    saveProof(proofData: ProofData, outputPath: string): void {
        fs.writeFileSync(outputPath, JSON.stringify(proofData, null, 2));
        console.log(`💾 Proof saved to ${outputPath}`);
    }

    /**
     * 从文件加载证明
     * @param filePath 证明文件路径
     * @returns 证明数据
     */
    static loadProof(filePath: string): ProofData {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    }
}
