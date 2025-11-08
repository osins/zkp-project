#!/bin/bash

set -e

echo "🚀 ZKP Project Setup Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查前置条件
echo ""
echo "📋 Checking prerequisites..."

# 检查 Rust
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust not found. Please install from https://rustup.rs/"
    exit 1
else
    echo "✓ Rust: $(rustc --version)"
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install from https://nodejs.org/"
    exit 1
else
    echo "✓ Node.js: $(node --version)"
fi

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found."
    exit 1
else
    echo "✓ npm: $(npm --version)"
fi

# 检查 Circom
if ! command -v circom &> /dev/null; then
    echo "⚠️  Circom not found. Installing..."
    npm install -g circom
else
    echo "✓ Circom: $(circom --version)"
fi

# 安装依赖
echo ""
echo "📦 Installing dependencies..."

echo "  → Circom circuits..."
cd circom-circuits && npm install && cd ..

echo "  → Node SDK..."
cd node-sdk && npm install && cd ..

echo "  → Smart contracts..."
cd smart-contracts && npm install && cd ..

echo "  → Backend..."
cd backend && npm install && cd ..

# 设置环境变量文件
echo ""
echo "⚙️  Setting up environment files..."

if [ ! -f "node-sdk/.env" ]; then
    cp node-sdk/.env.example node-sdk/.env
    echo "  ✓ Created node-sdk/.env"
fi

if [ ! -f "smart-contracts/.env" ]; then
    cp smart-contracts/.env.example smart-contracts/.env
    echo "  ✓ Created smart-contracts/.env"
fi

if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "  ✓ Created backend/.env"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📖 Next steps:"
echo "  1. Build circuits:        npm run build:circuits"
echo "  2. Deploy contracts:      cd smart-contracts && npm run deploy:localhost"
echo "  3. Generate proof:        cd node-sdk && npm run generate-proof"
echo "  4. Run full demo:         npm run demo"
echo ""
