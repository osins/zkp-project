#!/bin/bash

set -e

CIRCUIT_NAME="example"
BUILD_DIR="build"
CIRCUIT_DIR="circuits"
PTAU_FILE="powersOfTau28_hez_final_12.ptau"

echo "🔧 Building Circom circuit: $CIRCUIT_NAME"

# 创建构建目录
mkdir -p $BUILD_DIR

# 1. 编译电路
echo "📝 Step 1: Compiling circuit..."
circom $CIRCUIT_DIR/$CIRCUIT_NAME.circom \
  --r1cs \
  --wasm \
  --sym \
  --c \
  -o $BUILD_DIR

# 2. 下载 Powers of Tau (如果不存在)
if [ ! -f "$BUILD_DIR/$PTAU_FILE" ]; then
    echo "⬇️  Step 2: Downloading Powers of Tau..."
    cd $BUILD_DIR
    wget https://hermez.s3-eu-west-1.amazonaws.com/$PTAU_FILE
    cd ..
else
    echo "✓ Powers of Tau already exists"
fi

# 3. 生成 zkey (第一阶段)
echo "🔑 Step 3: Generating zkey (Phase 1)..."
npx snarkjs groth16 setup \
  $BUILD_DIR/${CIRCUIT_NAME}.r1cs \
  $BUILD_DIR/$PTAU_FILE \
  $BUILD_DIR/${CIRCUIT_NAME}_0000.zkey

# 4. 贡献随机性 (第二阶段)
echo "🎲 Step 4: Contributing randomness (Phase 2)..."
npx snarkjs zkey contribute \
  $BUILD_DIR/${CIRCUIT_NAME}_0000.zkey \
  $BUILD_DIR/${CIRCUIT_NAME}_final.zkey \
  --name="First contribution" \
  -v \
  -e="random entropy"

# 5. 导出验证密钥
echo "📤 Step 5: Exporting verification key..."
npx snarkjs zkey export verificationkey \
  $BUILD_DIR/${CIRCUIT_NAME}_final.zkey \
  $BUILD_DIR/verification_key.json

# 6. 生成 Solidity verifier
echo "📜 Step 6: Generating Solidity verifier..."
npx snarkjs zkey export solidityverifier \
  $BUILD_DIR/${CIRCUIT_NAME}_final.zkey \
  $BUILD_DIR/Verifier.sol

echo "✅ Circuit build complete!"
echo "📁 Output files:"
echo "  - R1CS: $BUILD_DIR/${CIRCUIT_NAME}.r1cs"
echo "  - WASM: $BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm"
echo "  - zkey: $BUILD_DIR/${CIRCUIT_NAME}_final.zkey"
echo "  - Verification key: $BUILD_DIR/verification_key.json"
echo "  - Solidity verifier: $BUILD_DIR/Verifier.sol"
