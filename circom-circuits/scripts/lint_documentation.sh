#!/bin/bash

# 检查文档完整性的脚本

set -e

echo "📝 Checking circuit documentation..."

FOUND_ISSUES=0

# 必需的文档字段
REQUIRED_FIELDS=(
    "Circuit:"
    "Purpose:\|用途:"
    "Status:\|状态:"
    "Inputs:\|输入:"
    "Outputs:\|输出:"
    "Author:\|作者:"
)

# 检查生产电路
if [ -d "circuits/production" ]; then
    echo "Checking production circuits..."
    
    for file in circuits/production/*.circom; do
        if [ -f "$file" ]; then
            echo "  Checking $file..."
            
            for field in "${REQUIRED_FIELDS[@]}"; do
                if ! grep -q "$field" "$file"; then
                    echo "    ❌ Missing required field: $field"
                    FOUND_ISSUES=$((FOUND_ISSUES + 1))
                fi
            done
        fi
    done
fi

# 检查示例电路（宽松要求）
if [ -d "circuits/examples" ]; then
    echo "Checking example circuits..."
    
    for file in circuits/examples/*.circom; do
        # 跳过废弃的电路
        if [[ "$file" =~ DEPRECATED ]]; then
            continue
        fi
        
        if [ -f "$file" ]; then
            echo "  Checking $file..."
            
            # 示例电路只需要基本文档
            if ! grep -q "Circuit:\|用途:" "$file"; then
                echo "    ⚠️  Missing basic documentation"
                # 示例电路只警告，不失败
            fi
        fi
    done
fi

if [ $FOUND_ISSUES -eq 0 ]; then
    echo "✅ All circuits have proper documentation"
    exit 0
else
    echo "❌ Found $FOUND_ISSUES documentation issue(s)"
    exit 1
fi
