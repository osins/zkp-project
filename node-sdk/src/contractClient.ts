import { ethers } from 'ethers';
import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import { ProofData } from './index';

export class ContractClient {
    private provider: ethers.Provider;
    private signer?: ethers.Signer;
    private contract?: ethers.Contract;

    constructor(rpcUrl: string, privateKey?: string) {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        
        if (privateKey) {
            this.signer = new ethers.Wallet(privateKey, this.provider);
        }
    }

    /**
     * 连接到已部署的 Verifier 合约
     * @param contractAddress 合约地址
     * @param abiPath ABI 文件路径
     */
    async connect(contractAddress: string, abiPath: string): Promise<void> {
        const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        
        if (this.signer) {
            this.contract = new ethers.Contract(contractAddress, abi, this.signer);
        } else {
            this.contract = new ethers.Contract(contractAddress, abi, this.provider);
        }

        console.log(`✅ Connected to verifier contract at ${contractAddress}`);
    }

    /**
     * 链上验证证明
     * @param proofData 证明数据
     * @returns 验证结果
     */
    async verifyProofOnChain(proofData: ProofData): Promise<boolean> {
        if (!this.contract) {
            throw new Error('Contract not connected. Call connect() first.');
        }

        console.log('🔗 Verifying proof on-chain...');

        try {
            // 准备调用数据
            const calldata = await snarkjs.groth16.exportSolidityCallData(
                proofData.proof,
                proofData.publicSignals
            );

            // 解析 calldata
            const argv = calldata
                .replace(/["[\]\s]/g, "")
                .split(',')
                .map((x: string) => BigInt(x).toString());

            const a = [argv[0], argv[1]];
            const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
            const c = [argv[6], argv[7]];
            const input = argv.slice(8);

            // 调用合约验证
            const verified = await this.contract.verifyProof(a, b, c, input);

            if (verified) {
                console.log('✅ On-chain verification successful!');
            } else {
                console.log('❌ On-chain verification failed!');
            }

            return verified;
        } catch (error) {
            console.error('❌ On-chain verification error:', error);
            throw error;
        }
    }

    /**
     * 部署 Verifier 合约
     * @param contractPath Solidity 合约路径
     * @returns 合约地址
     */
    async deployVerifier(contractPath: string): Promise<string> {
        if (!this.signer) {
            throw new Error('No signer available. Provide private key in constructor.');
        }

        console.log('📜 Deploying Verifier contract...');

        // 读取合约源码（需要先编译）
        // 这里假设已经有编译好的 artifact
        const artifact = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
        
        const factory = new ethers.ContractFactory(
            artifact.abi,
            artifact.bytecode,
            this.signer
        );

        const contract = await factory.deploy();
        await contract.waitForDeployment();

        const address = await contract.getAddress();
        console.log(`✅ Verifier deployed at: ${address}`);

        return address;
    }

    /**
     * 获取账户余额
     * @param address 地址
     * @returns 余额（以 ETH 为单位）
     */
    async getBalance(address: string): Promise<string> {
        const balance = await this.provider.getBalance(address);
        return ethers.formatEther(balance);
    }

    /**
     * 获取当前区块号
     */
    async getBlockNumber(): Promise<number> {
        return await this.provider.getBlockNumber();
    }
}
