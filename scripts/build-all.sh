#!/bin/bash

set -e

echo "🔨 Building ZKP Project"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. 构建 Circom 电路
echo ""
echo "1️⃣  Building Circom circuits..."
cd circom-circuits
npm run build
cd ..

# 2. 构建 Rust（可选）
echo ""
echo "2️⃣  Building Rust prover..."
cd rust-prover
cargo build --release
cd ..

# 3. 构建 Node SDK
echo ""
echo "3️⃣  Building Node SDK..."
cd node-sdk
npm run build
cd ..

# 4. 编译智能合约
echo ""
echo "4️⃣  Compiling smart contracts..."
cd smart-contracts
npm run compile
cd ..

# 5. 构建 Backend
echo ""
echo "5️⃣  Building backend..."
cd backend
npm run build
cd ..

echo ""
echo "✅ Build complete!"
echo ""
