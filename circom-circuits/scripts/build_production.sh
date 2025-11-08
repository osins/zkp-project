#!/bin/bash

###############################################################################
# 生产级电路构建脚本
###############################################################################
#
# 用途: 编译所有生产级电路并生成必要的构件
# 状态: ✅ 生产级
#
# 功能:
#   - 编译所有 production/ 目录下的电路
#   - 生成 R1CS、WASM 和符号文件
#   - 验证约束数量
#   - 生成构建报告
#
# 使用方法:
#   ./scripts/build_production.sh
#
# 输出:
#   - build/production/[circuit_name]/
#     - circuit.r1cs
#     - circuit_js/circuit.wasm
#     - circuit.sym
#     - constraint_report.txt
#
# 前置条件:
#   - 已安装 circom (>= 2.0.0)
#   - 已安装 snarkjs
#   - 在 circom-circuits 目录下执行
#
# 作者: ZKP Project Team
# 版本: 1.0.0
# 创建日期: 2025-11-08
###############################################################################

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
CIRCUITS_DIR="circuits/production"
BUILD_DIR="build/production"
REPORT_FILE="$BUILD_DIR/build_report.txt"

# 检查 circom 是否安装
if ! command -v circom &> /dev/null; then
    echo -e "${RED}❌ 错误: circom 未安装${NC}"
    echo "请访问 https://docs.circom.io/getting-started/installation/ 安装 circom"
    exit 1
fi

# 检查 circom 版本
CIRCOM_VERSION=$(circom --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
echo -e "${BLUE}ℹ️  Circom 版本: $CIRCOM_VERSION${NC}"

# 创建构建目录
echo -e "${BLUE}📁 创建构建目录...${NC}"
mkdir -p "$BUILD_DIR"

# 初始化报告
echo "================================================================================" > "$REPORT_FILE"
echo "生产级电路构建报告" >> "$REPORT_FILE"
echo "================================================================================" >> "$REPORT_FILE"
echo "构建时间: $(date)" >> "$REPORT_FILE"
echo "Circom 版本: $CIRCOM_VERSION" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 统计变量
TOTAL_CIRCUITS=0
SUCCESS_COUNT=0
FAILED_COUNT=0

# 查找所有生产级电路
echo -e "${BLUE}🔍 搜索生产级电路...${NC}"
CIRCUITS=$(find "$CIRCUITS_DIR" -name "*.circom" -type f)

if [ -z "$CIRCUITS" ]; then
    echo -e "${YELLOW}⚠️  警告: 未找到任何电路文件${NC}"
    exit 0
fi

# 编译每个电路
for circuit_file in $CIRCUITS; do
    TOTAL_CIRCUITS=$((TOTAL_CIRCUITS + 1))
    
    # 提取电路名称
    circuit_name=$(basename "$circuit_file" .circom)
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📦 构建电路: $circuit_name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # 创建输出目录
    output_dir="$BUILD_DIR/$circuit_name"
    mkdir -p "$output_dir"
    
    # 记录到报告
    echo "电路: $circuit_name" >> "$REPORT_FILE"
    echo "文件: $circuit_file" >> "$REPORT_FILE"
    
    # 编译电路
    echo -e "${YELLOW}⚙️  编译中...${NC}"
    if circom "$circuit_file" \
        --r1cs "$output_dir/${circuit_name}.r1cs" \
        --wasm \
        --sym "$output_dir/${circuit_name}.sym" \
        --output "$output_dir" \
        --verbose 2>&1 | tee "$output_dir/compile.log"; then
        
        echo -e "${GREEN}✅ 编译成功${NC}"
        
        # 获取约束信息
        if [ -f "$output_dir/${circuit_name}.r1cs" ]; then
            # 使用 snarkjs 获取约束数量
            if command -v snarkjs &> /dev/null; then
                constraint_info=$(snarkjs r1cs info "$output_dir/${circuit_name}.r1cs" 2>/dev/null || echo "无法获取约束信息")
                echo "$constraint_info" | tee "$output_dir/constraint_report.txt"
                echo "约束信息:" >> "$REPORT_FILE"
                echo "$constraint_info" >> "$REPORT_FILE"
            else
                echo -e "${YELLOW}⚠️  snarkjs 未安装，跳过约束分析${NC}"
                echo "约束信息: 未获取 (snarkjs 未安装)" >> "$REPORT_FILE"
            fi
        fi
        
        # 验证 WASM 文件存在
        wasm_file="$output_dir/${circuit_name}_js/${circuit_name}.wasm"
        if [ -f "$wasm_file" ]; then
            wasm_size=$(ls -lh "$wasm_file" | awk '{print $5}')
            echo -e "${GREEN}✅ WASM 文件生成成功 (大小: $wasm_size)${NC}"
            echo "WASM 大小: $wasm_size" >> "$REPORT_FILE"
        else
            echo -e "${RED}❌ WASM 文件未生成${NC}"
            echo "WASM 状态: 失败" >> "$REPORT_FILE"
        fi
        
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo "状态: ✅ 成功" >> "$REPORT_FILE"
        
    else
        echo -e "${RED}❌ 编译失败${NC}"
        echo "状态: ❌ 失败" >> "$REPORT_FILE"
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
    
    echo "" >> "$REPORT_FILE"
done

# 生成总结
echo "" >> "$REPORT_FILE"
echo "================================================================================" >> "$REPORT_FILE"
echo "构建总结" >> "$REPORT_FILE"
echo "================================================================================" >> "$REPORT_FILE"
echo "总电路数: $TOTAL_CIRCUITS" >> "$REPORT_FILE"
echo "成功: $SUCCESS_COUNT" >> "$REPORT_FILE"
echo "失败: $FAILED_COUNT" >> "$REPORT_FILE"
echo "================================================================================" >> "$REPORT_FILE"

# 打印总结
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 构建总结${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "总电路数: ${BLUE}$TOTAL_CIRCUITS${NC}"
echo -e "成功: ${GREEN}$SUCCESS_COUNT${NC}"
echo -e "失败: ${RED}$FAILED_COUNT${NC}"
echo ""
echo -e "${BLUE}📄 完整报告: $REPORT_FILE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 退出码
if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${RED}⚠️  部分电路构建失败${NC}"
    exit 1
else
    echo -e "${GREEN}🎉 所有电路构建成功！${NC}"
    exit 0
fi
