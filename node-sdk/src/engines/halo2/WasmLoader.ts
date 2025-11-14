/**
 * Rust Halo2 WASM 加载器
 */

import * as path from 'path';
import * as fs from 'fs';

/**
 * WASM 模块接口（基于 rust-prover/pkg/zkp_rust_prover.d.ts）
 */
export interface Halo2WasmModule {
    init_panic_hook(): void;
    
    // Square 电路
    wasm_generate_proof(x: number): Uint8Array;
    wasm_verify_proof(proof_with_y: Uint8Array): boolean;
    
    // AgeVerification 电路
    wasm_generate_age_proof(age: number, salt_str: string, min_age: number, max_age: number): string;
    wasm_verify_age_proof(proof_hex: string, commitment_str: string, valid_str: string): boolean;
    
    // BalanceProof 电路
    wasm_generate_balance_proof(balance: bigint, salt_str: string, account_id_str: string, required_amount: bigint): Uint8Array;
    wasm_verify_balance_proof(proof_buffer: Uint8Array): boolean;
}

/**
 * BalanceProof 生成结果
 */
export interface BalanceProofWasmResult {
    proof: string;
    publicSignals: [string, string];
}

/**
 * BalanceProof 解析结果
 */
export interface BalanceProofParsed {
    proofHex: string;
    commitment: string;
    sufficient: string;
}

/**
 * WASM 加载器
 */
export class WasmLoader {
    private wasmModule: Halo2WasmModule | null = null;
    private wasmPath: string;
    private initialized: boolean = false;
    
    constructor(wasmPath: string) {
        this.wasmPath = wasmPath;
    }
    
    async init(): Promise<void> {
        if (this.initialized) {
            return;
        }
        
        try {
            if (!fs.existsSync(this.wasmPath)) {
                throw new Error(
                    `WASM 路径不存在: ${this.wasmPath}\n` +
                    `请确保已构建 rust-prover:\n` +
                    `  cd rust-prover && wasm-pack build --target nodejs`
                );
            }
            
            const wasmFile = path.join(this.wasmPath, 'zkp_rust_prover.js');
            if (!fs.existsSync(wasmFile)) {
                throw new Error(
                    `WASM 模块文件不存在: ${wasmFile}\n` +
                    `需要的文件:\n` +
                    `  - zkp_rust_prover.js\n` +
                    `  - zkp_rust_prover_bg.wasm\n` +
                    `  - zkp_rust_prover.d.ts`
                );
            }
            
            const absolutePath = path.resolve(wasmFile);
            this.wasmModule = require(absolutePath);
            
            if (!this.wasmModule) {
                throw new Error('WASM 模块加载失败');
            }
            
            if (this.wasmModule.init_panic_hook) {
                this.wasmModule.init_panic_hook();
            }
            
            this.initialized = true;
            
        } catch (error: any) {
            throw new Error(
                `WASM 加载失败: ${error.message}\n` +
                `提示: 确保 rust-prover 已正确构建`
            );
        }
    }
    
    async generateProof(x: number): Promise<Uint8Array> {
        this.assertInitialized();
        try {
            return this.wasmModule!.wasm_generate_proof(x);
        } catch (error: any) {
            throw new Error(`Halo2 证明生成失败: ${error.message}`);
        }
    }
    
    async verifyProof(proofWithY: Uint8Array): Promise<boolean> {
        this.assertInitialized();
        try {
            return this.wasmModule!.wasm_verify_proof(proofWithY);
        } catch (error: any) {
            throw new Error(`Halo2 证明验证失败: ${error.message}`);
        }
    }
    
    async generateAgeProof(
        age: number,
        salt: string,
        minAge: number,
        maxAge: number
    ): Promise<string> {
        this.assertInitialized();
        try {
            return this.wasmModule!.wasm_generate_age_proof(age, salt, minAge, maxAge);
        } catch (error: any) {
            throw new Error(`Halo2 AgeVerification 证明生成失败: ${error.message}`);
        }
    }
    
    async verifyAgeProof(
        proofHex: string,
        commitment: string,
        valid: string
    ): Promise<boolean> {
        this.assertInitialized();
        try {
            return this.wasmModule!.wasm_verify_age_proof(proofHex, commitment, valid);
        } catch (error: any) {
            throw new Error(`Halo2 AgeVerification 证明验证失败: ${error.message}`);
        }
    }
    
    /**
     * 生成 BalanceProof 证明
     * 返回结构化结果，包含十六进制证明与公开信号
     */
    async generateBalanceProof(
        balance: bigint,
        saltHex: string,
        accountIdHex: string,
        requiredAmount: bigint
    ): Promise<BalanceProofWasmResult> {
        this.assertInitialized();
        try {
            const proofBuffer = this.wasmModule!.wasm_generate_balance_proof(
                balance,
                saltHex,
                accountIdHex,
                requiredAmount
            );
            return this.parseBalanceProofBuffer(proofBuffer);
        } catch (error: any) {
            throw new Error(`Halo2 BalanceProof 证明生成失败: ${error.message}`);
        }
    }
    
    /**
     * 验证 BalanceProof 证明（字节流格式）
     */
    async verifyBalanceProofBuffer(proofWithPrefix: Uint8Array): Promise<boolean> {
        this.assertInitialized();
        try {
            return this.wasmModule!.wasm_verify_balance_proof(proofWithPrefix);
        } catch (error: any) {
            throw new Error(`Halo2 BalanceProof 证明验证失败: ${error.message}`);
        }
    }
    
    /**
     * 将 BalanceProof 证明与公开信号编码为字节流
     * 格式: [commitment(32 bytes) | sufficient(1 byte) | proof bytes]
     */
    encodeBalanceProof(
        proofHex: string,
        commitment: string,
        sufficient: string
    ): Uint8Array {
        const proofBytes = this.hexToBytes(proofHex);
        const commitmentBytes = this.commitmentToBytes(commitment);
        const sufficientByte = this.sufficientToByte(sufficient);

        const result = new Uint8Array(32 + 1 + proofBytes.length);
        result.set(commitmentBytes, 0);
        result[32] = sufficientByte;
        result.set(proofBytes, 33);
        return result;
    }
    
    /**
     * 解析 BalanceProof 字节流格式为可读结构
     */
    parseBalanceProofBuffer(proofBuffer: Uint8Array): BalanceProofWasmResult {
        if (proofBuffer.length < 33) {
            throw new Error('BalanceProof 字节流长度不足');
        }

        const commitmentBytes = proofBuffer.slice(0, 32);
        const sufficientByte = proofBuffer[32];
        if (sufficientByte > 1) {
            throw new Error('sufficient 字节非法');
        }

        const proofBytes = proofBuffer.slice(33);

        return {
            proof: `0x${Buffer.from(proofBytes).toString('hex')}`,
            publicSignals: [
                this.bytesToDecimalString(commitmentBytes),
                sufficientByte.toString()
            ]
        };
    }
    
    /**
     * 获取原始 WASM 模块
     */
    getWasm(): Halo2WasmModule {
        this.assertInitialized();
        return this.wasmModule!;
    }
    
    isInitialized(): boolean {
        return this.initialized;
    }
    
    private assertInitialized(): void {
        if (!this.initialized || !this.wasmModule) {
            throw new Error('WASM 模块未初始化，请先调用 init()');
        }
    }
    
    private commitmentToBytes(commitment: string): Uint8Array {
        const numeric = BigInt(commitment);
        const bytes = new Uint8Array(32);
        let temp = numeric;
        for (let i = 0; i < 32; i++) {
            bytes[i] = Number(temp & 0xffn);
            temp >>= 8n;
        }
        return bytes;
    }
    
    private sufficientToByte(sufficient: string): number {
        if (sufficient !== '0' && sufficient !== '1') {
            throw new Error('sufficient 必须为 "0" 或 "1"');
        }
        return Number(sufficient);
    }
    
    private hexToBytes(hex: string): Uint8Array {
        const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
        if (normalized.length % 2 !== 0) {
            throw new Error('hex 字符串长度必须为偶数');
        }
        const bytes = new Uint8Array(normalized.length / 2);
        for (let i = 0; i < normalized.length; i += 2) {
            bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
        }
        return bytes;
    }
    
    private bytesToDecimalString(bytes: Uint8Array): string {
        let value = 0n;
        for (let i = bytes.length - 1; i >= 0; i--) {
            value = (value << 8n) | BigInt(bytes[i]);
        }
        return value.toString();
    }
}
