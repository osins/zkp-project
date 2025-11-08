#!/bin/bash

set -e

echo "🎬 ZKP Project Demo"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 确保电路已构建
if [ ! -f "circom-circuits/build/example_final.zkey" ]; then
    echo "⚠️  Circuit not built. Building now..."
    cd circom-circuits
    npm run build
    cd ..
fi

echo ""
echo "📋 Demo Steps:"
echo "  1. Generate ZK proof"
echo "  2. Verify proof off-chain"
echo "  3. Deploy contracts (localhost)"
echo "  4. Verify proof on-chain"
echo ""
read -p "Press Enter to start demo..."

# Step 1: 生成证明
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Generating ZK Proof"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd node-sdk
npm run generate-proof
cd ..

echo ""
read -p "Press Enter to continue to verification..."

# Step 2: 链下验证
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Verifying Proof Off-Chain"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd node-sdk
npm run verify-proof
cd ..

echo ""
echo "⚠️  For on-chain verification, you need to:"
echo "  1. Start Hardhat node:     cd smart-contracts && npx hardhat node"
echo "  2. Deploy contracts:        cd smart-contracts && npm run deploy:localhost"
echo "  3. Verify on-chain:         cd smart-contracts && node scripts/verify-on-chain.js"
echo ""
echo "✅ Demo complete!"
