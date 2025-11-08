#!/bin/bash

set -e

# 检查参数
if [ -z "$1" ]; then
    echo "❌ Usage: bash scripts/build_example.sh <circuit_name>"
    echo "   Example: bash scripts/build_example.sh multiplier"
    exit 1
fi

CIRCUIT_NAME="$1"
BUILD_DIR="build"
CIRCUIT_DIR="circuits/examples"
PTAU_FILE="powersOfTau28_hez_final_12.ptau"

# 检查电路文件是否存在
if [ ! -f "$CIRCUIT_DIR/$CIRCUIT_NAME.circom" ]; then
    echo "❌ Error: Circuit file not found: $CIRCUIT_DIR/$CIRCUIT_NAME.circom"
    echo ""
    echo "Available circuits:"
    ls -1 $CIRCUIT_DIR/*.circom | grep -v "DEPRECATED" || echo "  (none)"
    exit 1
fi

# 检查是否是废弃的电路
if [[ "$CIRCUIT_NAME" == DEPRECATED_* ]]; then
    echo "⚠️  Warning: This is a deprecated circuit with known issues!"
    echo "   It should NOT be used for any purpose."
    echo ""
    read -p "   Do you still want to build it? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ Build cancelled."
        exit 1
    fi
fi

echo "🔧 Building Circom circuit: $CIRCUIT_NAME"
echo "📁 Source: $CIRCUIT_DIR/$CIRCUIT_NAME.circom"
echo ""

# 创建构建目录
mkdir -p $BUILD_DIR

# 1. 编译电路
echo "📝 Step 1: Compiling circuit..."
circom $CIRCUIT_DIR/$CIRCUIT_NAME.circom \
  --r1cs \
  --wasm \
  --sym \
  -o $BUILD_DIR

echo "✓ Circuit compiled"
echo ""

# 2. 下载 Powers of Tau (如果不存在)
if [ ! -f "$BUILD_DIR/$PTAU_FILE" ]; then
    echo "⬇️  Step 2: Downloading Powers of Tau..."
    cd $BUILD_DIR
    curl -L -o $PTAU_FILE https://storage.googleapis.com/zkevm/ptau/$PTAU_FILE || \
    curl -L -o $PTAU_FILE https://hermez.s3-eu-west-1.amazonaws.com/$PTAU_FILE || \
    curl -L -o $PTAU_FILE https://hermezptau.blob.core.windows.net/ptau/$PTAU_FILE
    cd ..
    echo "✓ Powers of Tau downloaded"
else
    echo "✓ Powers of Tau already exists"
fi
echo ""

# 3. 生成 zkey (第一阶段)
echo "🔑 Step 3: Generating zkey (Phase 1)..."
npx snarkjs groth16 setup \
  $BUILD_DIR/${CIRCUIT_NAME}.r1cs \
  $BUILD_DIR/$PTAU_FILE \
  $BUILD_DIR/${CIRCUIT_NAME}_0000.zkey
echo "✓ Phase 1 complete"
echo ""

# 4. 贡献随机性 (第二阶段)
echo "🎲 Step 4: Contributing randomness (Phase 2)..."
npx snarkjs zkey contribute \
  $BUILD_DIR/${CIRCUIT_NAME}_0000.zkey \
  $BUILD_DIR/${CIRCUIT_NAME}_final.zkey \
  --name="First contribution" \
  -v \
  -e="random entropy $(date +%s)"
echo "✓ Phase 2 complete"
echo ""

# 5. 导出验证密钥
echo "📤 Step 5: Exporting verification key..."
npx snarkjs zkey export verificationkey \
  $BUILD_DIR/${CIRCUIT_NAME}_final.zkey \
  $BUILD_DIR/${CIRCUIT_NAME}_verification_key.json
echo "✓ Verification key exported"
echo ""

# 6. 生成 Solidity verifier
echo "📜 Step 6: Generating Solidity verifier..."
npx snarkjs zkey export solidityverifier \
  $BUILD_DIR/${CIRCUIT_NAME}_final.zkey \
  $BUILD_DIR/${CIRCUIT_NAME}_Verifier.sol
echo "✓ Solidity verifier generated"
echo ""

# 7. 显示电路信息
echo "📊 Step 7: Circuit information..."
npx snarkjs r1cs info $BUILD_DIR/${CIRCUIT_NAME}.r1cs
echo ""

echo "✅ Build complete!"
echo ""
echo "📁 Output files:"
echo "  - R1CS: $BUILD_DIR/${CIRCUIT_NAME}.r1cs"
echo "  - WASM: $BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm"
echo "  - zkey: $BUILD_DIR/${CIRCUIT_NAME}_final.zkey"
echo "  - Verification key: $BUILD_DIR/${CIRCUIT_NAME}_verification_key.json"
echo "  - Solidity verifier: $BUILD_DIR/${CIRCUIT_NAME}_Verifier.sol"
echo ""
echo "🧪 Next steps:"
echo "  - Test the circuit: npm run test:example $CIRCUIT_NAME"
echo "  - Generate proof: node scripts/generate_proof.js $CIRCUIT_NAME"
