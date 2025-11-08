#!/bin/bash

# Node SDK 快速验证脚本
# 用于一键验证 node-sdk 与 circom-circuits 的集成

set -e

echo "🚀 Node SDK 快速验证脚本"
echo "========================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 计数器
PASSED=0
FAILED=0

# 测试函数
run_test() {
    local test_name=$1
    local test_cmd=$2
    
    echo -n "🔍 ${test_name}... "
    
    if eval "$test_cmd" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 通过${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ 失败${NC}"
        ((FAILED++))
        return 1
    fi
}

echo "📋 环境检查"
echo "----------------------------------------"

# 检查 Node.js
run_test "检查 Node.js" "node --version"
NODE_VERSION=$(node --version)
echo "   Node.js 版本: ${NODE_VERSION}"

# 检查 npm
run_test "检查 npm" "npm --version"
NPM_VERSION=$(npm --version)
echo "   npm 版本: ${NPM_VERSION}"

# 检查依赖
run_test "检查 node_modules" "test -d node_modules"

echo ""
echo "📦 文件结构检查"
echo "----------------------------------------"

# 检查源代码文件
run_test "检查 proverClient.ts" "test -f src/proverClient.ts"
run_test "检查 verifierClient.ts" "test -f src/verifierClient.ts"
run_test "检查 contractClient.ts" "test -f src/contractClient.ts"
run_test "检查 index.ts" "test -f src/index.ts"

# 检查测试文件
run_test "检查集成测试" "test -f src/__tests__/integration.test.ts"

# 检查脚本文件
run_test "检查生成证明脚本" "test -f scripts/generateProof.ts"
run_test "检查验证证明脚本" "test -f scripts/verifyProof.ts"

echo ""
echo "🔗 Circom Circuits 集成检查"
echo "----------------------------------------"

# 检查构建产物
BUILD_DIR="../circom-circuits/build"
run_test "检查 WASM 文件" "test -f ${BUILD_DIR}/example_js/example.wasm"
run_test "检查 zkey 文件" "test -f ${BUILD_DIR}/example_final.zkey"
run_test "检查验证密钥" "test -f ${BUILD_DIR}/verification_key.json"

echo ""
echo "🧪 功能测试"
echo "----------------------------------------"

# 运行 Jest 测试
echo "🔍 运行 Jest 单元测试..."
if npm test -- --silent > /tmp/jest_output.txt 2>&1; then
    JEST_RESULT=$(grep -E "Tests:.*passed" /tmp/jest_output.txt | head -1)
    echo -e "${GREEN}✅ Jest 测试通过${NC}"
    echo "   ${JEST_RESULT}"
    ((PASSED++))
else
    echo -e "${RED}❌ Jest 测试失败${NC}"
    cat /tmp/jest_output.txt
    ((FAILED++))
fi

# 运行集成验证
echo ""
echo "🔍 运行集成验证测试..."
if npm run test:integration > /tmp/integration_output.txt 2>&1; then
    INTEGRATION_RESULT=$(grep -E "通过率:" /tmp/integration_output.txt | tail -1)
    echo -e "${GREEN}✅ 集成验证通过${NC}"
    echo "   ${INTEGRATION_RESULT}"
    ((PASSED++))
else
    echo -e "${RED}❌ 集成验证失败${NC}"
    cat /tmp/integration_output.txt
    ((FAILED++))
fi

echo ""
echo "========================================"
echo "📊 验证总结"
echo "========================================"
echo ""

TOTAL=$((PASSED + FAILED))
PASS_RATE=$(awk "BEGIN {printf \"%.2f\", ($PASSED/$TOTAL)*100}")

echo "总测试项: ${TOTAL}"
echo -e "${GREEN}✅ 通过: ${PASSED}${NC}"
echo -e "${RED}❌ 失败: ${FAILED}${NC}"
echo "通过率: ${PASS_RATE}%"

echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 所有验证通过！node-sdk 已正确集成 circom-circuits${NC}"
    echo ""
    echo "✅ 可用功能:"
    echo "   • 零知识证明生成"
    echo "   • 链下证明验证"
    echo "   • Solidity calldata 导出"
    echo "   • 证明持久化"
    echo ""
    echo "📖 使用方法:"
    echo "   npm run generate-proof  # 生成证明"
    echo "   npm run verify-proof    # 验证证明"
    echo "   npm test                # 运行测试"
    echo ""
    exit 0
else
    echo -e "${RED}❌ 部分验证失败，请检查错误信息${NC}"
    echo ""
    echo "🔍 调试建议:"
    echo "   1. 确保 circom-circuits 已正确构建"
    echo "   2. 运行 'npm install' 安装依赖"
    echo "   3. 检查 Node.js 版本 >= 18.0.0"
    echo ""
    exit 1
fi
