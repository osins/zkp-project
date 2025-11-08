#!/bin/bash

# 环境检查脚本

echo "🔍 ZKP Project Environment Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ERRORS=0

# 检查 Rust
echo -n "Checking Rust... "
if command -v rustc &> /dev/null; then
    VERSION=$(rustc --version | cut -d' ' -f2)
    echo "✅ $VERSION"
else
    echo "❌ Not found"
    echo "   Install from: https://rustup.rs/"
    ERRORS=$((ERRORS + 1))
fi

# 检查 Cargo
echo -n "Checking Cargo... "
if command -v cargo &> /dev/null; then
    VERSION=$(cargo --version | cut -d' ' -f2)
    echo "✅ $VERSION"
else
    echo "❌ Not found"
    ERRORS=$((ERRORS + 1))
fi

# 检查 Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    VERSION=$(node --version)
    MAJOR=$(echo $VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$MAJOR" -ge 18 ]; then
        echo "✅ $VERSION"
    else
        echo "⚠️  $VERSION (需要 v18+)"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "❌ Not found"
    echo "   Install from: https://nodejs.org/"
    ERRORS=$((ERRORS + 1))
fi

# 检查 npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    VERSION=$(npm --version)
    echo "✅ $VERSION"
else
    echo "❌ Not found"
    ERRORS=$((ERRORS + 1))
fi

# 检查 Circom
echo -n "Checking Circom... "
if command -v circom &> /dev/null; then
    VERSION=$(circom --version 2>&1 | head -n1)
    echo "✅ $VERSION"
else
    echo "⚠️  Not found (will be installed)"
    echo "   Run: npm install -g circom"
fi

# 检查 wasm-pack
echo -n "Checking wasm-pack... "
if command -v wasm-pack &> /dev/null; then
    VERSION=$(wasm-pack --version)
    echo "✅ $VERSION"
else
    echo "⚠️  Not found (optional for WASM)"
    echo "   Install: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh"
fi

# 检查 Git
echo -n "Checking Git... "
if command -v git &> /dev/null; then
    VERSION=$(git --version | cut -d' ' -f3)
    echo "✅ $VERSION"
else
    echo "❌ Not found"
    ERRORS=$((ERRORS + 1))
fi

# 检查项目文件
echo ""
echo "📁 Checking project structure..."

REQUIRED_DIRS=(
    "rust-prover"
    "circom-circuits"
    "node-sdk"
    "smart-contracts"
    "backend"
    "scripts"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    echo -n "   $dir/... "
    if [ -d "$dir" ]; then
        echo "✅"
    else
        echo "❌ Missing"
        ERRORS=$((ERRORS + 1))
    fi
done

# 检查关键文件
echo ""
echo "📄 Checking key files..."

REQUIRED_FILES=(
    "README.md"
    "QUICKSTART.md"
    "package.json"
    "circom-circuits/circuits/example.circom"
    "rust-prover/Cargo.toml"
    "node-sdk/package.json"
    "smart-contracts/hardhat.config.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    echo -n "   $file... "
    if [ -f "$file" ]; then
        echo "✅"
    else
        echo "❌ Missing"
        ERRORS=$((ERRORS + 1))
    fi
done

# 检查依赖安装状态
echo ""
echo "📦 Checking dependencies..."

check_node_modules() {
    local dir=$1
    echo -n "   $dir/node_modules... "
    if [ -d "$dir/node_modules" ]; then
        echo "✅ Installed"
    else
        echo "⚠️  Not installed (run: cd $dir && npm install)"
    fi
}

check_node_modules "circom-circuits"
check_node_modules "node-sdk"
check_node_modules "smart-contracts"
check_node_modules "backend"

# 检查 Rust 编译缓存
echo -n "   rust-prover/target... "
if [ -d "rust-prover/target" ]; then
    echo "✅ Built"
else
    echo "⚠️  Not built (run: cd rust-prover && cargo build)"
fi

# 总结
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
    echo "✅ Environment check passed!"
    echo ""
    echo "Next steps:"
    echo "  1. Run: bash scripts/setup.sh"
    echo "  2. Run: bash scripts/demo.sh"
else
    echo "❌ Found $ERRORS error(s)"
    echo ""
    echo "Please fix the issues above before proceeding."
    exit 1
fi
