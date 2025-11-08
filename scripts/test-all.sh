#!/bin/bash

set -e

echo "🧪 Running All Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Rust 测试
echo ""
echo "1️⃣  Testing Rust prover..."
cd rust-prover
cargo test
cd ..

# Circom 电路测试
echo ""
echo "2️⃣  Testing Circom circuits..."
cd circom-circuits
if [ -f "scripts/test_circuit.js" ]; then
    npm run test
else
    echo "  ⚠️  Skipping (circuit not built)"
fi
cd ..

# 智能合约测试
echo ""
echo "3️⃣  Testing smart contracts..."
cd smart-contracts
npm run test
cd ..

echo ""
echo "✅ All tests passed!"
