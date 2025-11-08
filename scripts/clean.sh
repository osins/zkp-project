#!/bin/bash

echo "🧹 Cleaning ZKP Project"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 清理 Rust
echo "  → Cleaning Rust..."
cd rust-prover
cargo clean
rm -f *.bin
cd ..

# 清理 Circom
echo "  → Cleaning Circom..."
cd circom-circuits
rm -rf build/*
cd ..

# 清理 Node SDK
echo "  → Cleaning Node SDK..."
cd node-sdk
rm -rf dist/
cd ..

# 清理智能合约
echo "  → Cleaning Smart Contracts..."
cd smart-contracts
rm -rf artifacts/ cache/ deployments.json .env.deployed
cd ..

# 清理 Backend
echo "  → Cleaning Backend..."
cd backend
rm -rf dist/
cd ..

echo ""
echo "✅ Clean complete!"
