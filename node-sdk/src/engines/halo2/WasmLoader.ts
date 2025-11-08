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
    wasm_generate_proof(x: number): Uint8Array;
    wasm_verify_proof(proof_with_y: Uint8Array): boolean;
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
    
    /**
     * 初始化 WASM 模块
     */
    async init(): Promise<void> {
        if (this.initialized) {
            return;
        }
        
        try {
            // 验证路径存在
            if (!fs.existsSync(this.wasmPath)) {
                throw new Error(
                    `WASM 路径不存在: ${this.wasmPath}\n` +
                    `请确保已构建 rust-prover:\n` +
                    `  cd rust-prover && wasm-pack build --target nodejs`
                );
            }
            
            // 动态加载 WASM 模块
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
            
            // 使用 require 加载 (CommonJS)
            const absolutePath = path.resolve(wasmFile);
            this.wasmModule = require(absolutePath);
            
            if (!this.wasmModule) {
                throw new Error('WASM 模块加载失败');
            }
            
            // 初始化 panic hook（用于更好的错误信息）
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
    
    /**
     * 生成证明
     */
    async generateProof(x: number): Promise<Uint8Array> {
        if (!this.initialized || !this.wasmModule) {
            throw new Error('WASM 模块未初始化，请先调用 init()');
        }
        
        try {
            const proofWithY = this.wasmModule.wasm_generate_proof(x);
            return proofWithY;
        } catch (error: any) {
            throw new Error(`Halo2 证明生成失败: ${error.message}`);
        }
    }
    
    /**
     * 验证证明
     */
    async verifyProof(proofWithY: Uint8Array): Promise<boolean> {
        if (!this.initialized || !this.wasmModule) {
            throw new Error('WASM 模块未初始化，请先调用 init()');
        }
        
        try {
            return this.wasmModule.wasm_verify_proof(proofWithY);
        } catch (error: any) {
            throw new Error(`Halo2 证明验证失败: ${error.message}`);
        }
    }
    
    /**
     * 检查是否已初始化
     */
    isInitialized(): boolean {
        return this.initialized;
    }
}
