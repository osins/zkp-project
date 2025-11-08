#!/usr/bin/env node

const { ethers } = require('ethers');
const { ContractClient } = require('../src/contractClient');

async function verifyOnChain() {
    try {
        console.log('Starting on-chain verification...');
        
        // 检查命令行参数
        if (process.argv.length < 4) {
            console.log('Usage: node verify-on-chain.js <contract-address> <proof-file>');
            console.log('Example: node verify-on-chain.js 0x1234... proof.json');
            return;
        }
        
        const contractAddress = process.argv[2];
        const proofFile = process.argv[3];
        
        console.log('Contract address:', contractAddress);
        console.log('Proof file:', proofFile);
        
        // 初始化合约客户端
        const client = new ContractClient(contractAddress);
        
        // 连接到网络
        await client.connect();
        
        // 读取证明文件
        const fs = require('fs');
        const proofData = JSON.parse(fs.readFileSync(proofFile, 'utf8'));
        
        console.log('Proof data loaded:', Object.keys(proofData));
        
        // 执行链上验证
        const result = await client.verifyProof(proofData);
        
        console.log('On-chain verification result:', result);
        
        if (result) {
            console.log('✅ Proof verified successfully on-chain!');
        } else {
            console.log('❌ Proof verification failed on-chain');
        }
        
    } catch (error) {
        console.error('Error during on-chain verification:', error.message);
        process.exit(1);
    }
}

// 如果是直接运行此文件
if (require.main === module) {
    verifyOnChain();
}

module.exports = { verifyOnChain };