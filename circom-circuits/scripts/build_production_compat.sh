#!/bin/bash

###############################################################################
# 生产级电路构建脚本（Circom 0.5.x 兼容版本）
###############################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CIRCUITS_DIR="circuits/production"
BUILD_DIR="build/production"
TEMP_DIR="build/temp"

echo -e "${BLUE}🔧 Circom 0.5.x 兼容构建模式${NC}"
echo ""

# 创建临时目录
mkdir -p "$TEMP_DIR"
mkdir -p "$BUILD_DIR"

# 统计
TOTAL=0
SUCCESS=0
FAILED=0

# 查找所有电路
for circuit_file in "$CIRCUITS_DIR"/*.circom; do
    if [ ! -f "$circuit_file" ]; then
        continue
    fi
    
    TOTAL=$((TOTAL + 1))
    circuit_name=$(basename "$circuit_file" .circom)
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📦 构建电路: $circuit_name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # 创建输出目录
    output_dir="$BUILD_DIR/$circuit_name"
    mkdir -p "$output_dir"
    
    # 创建兼容版本（移除 pragma 和不支持的 include）
    temp_file="$TEMP_DIR/${circuit_name}_compat.circom"
    
    # 移除 pragma circom 2.0.0 和 circomlib includes
    grep -v "^pragma circom" "$circuit_file" | \
    grep -v "^include \"circomlib" > "$temp_file"
    
    # 尝试编译
    echo -e "${YELLOW}⚙️  编译中...${NC}"
    if circom "$temp_file" \
        --r1cs --wasm --sym \
        --output "$output_dir" 2>&1 | tee "$output_dir/compile.log"; then
        
        # 重命名生成的文件
        if [ -f "$output_dir/${circuit_name}_compat.wasm" ]; then
            mv "$output_dir/${circuit_name}_compat.wasm" "$output_dir/${circuit_name}.wasm"
        fi
        if [ -f "$output_dir/${circuit_name}_compat.r1cs" ]; then
            mv "$output_dir/${circuit_name}_compat.r1cs" "$output_dir/${circuit_name}.r1cs"
        fi
        if [ -f "$output_dir/${circuit_name}_compat.sym" ]; then
            mv "$output_dir/${circuit_name}_compat.sym" "$output_dir/${circuit_name}.sym"
        fi
        
        if [ -f "$output_dir/${circuit_name}.wasm" ]; then
            wasm_size=$(ls -lh "$output_dir/${circuit_name}.wasm" | awk '{print $5}')
            echo -e "${GREEN}✅ 编译成功 (WASM: $wasm_size)${NC}"
            SUCCESS=$((SUCCESS + 1))
        else
            echo -e "${YELLOW}⚠️  编译成功但 WASM 未找到${NC}"
            SUCCESS=$((SUCCESS + 1))
        fi
    else
        echo -e "${RED}❌ 编译失败${NC}"
        FAILED=$((FAILED + 1))
    fi
    echo ""
done

# 清理临时文件
rm -rf "$TEMP_DIR"

# 总结
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 构建总结${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "总电路数: ${BLUE}$TOTAL${NC}"
echo -e "成功: ${GREEN}$SUCCESS${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${YELLOW}⚠️  部分电路构建失败${NC}"
    echo -e "${YELLOW}💡 注意: 依赖 circomlib 的电路需要独立实现${NC}"
    exit 1
else
    echo -e "${GREEN}🎉 所有电路构建成功！${NC}"
    exit 0
fi
