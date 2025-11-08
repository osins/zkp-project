#!/bin/bash

# 检查约束完整性的脚本

set -e

echo "✅ Checking constraint completeness..."

FOUND_ISSUES=0

# 检查生产电路
if [ -d "circuits/production" ]; then
    echo "Checking production circuits..."
    
    for file in circuits/production/*.circom; do
        if [ -f "$file" ]; then
            echo "  Checking $file..."
            
            # 检查是否有未约束的信号声明
            # 提取所有 signal 声明
            signals=$(grep -o "signal [a-zA-Z_][a-zA-Z0-9_]*" "$file" | awk '{print $2}' | sort -u)
            
            # 检查每个信号是否有约束
            for signal in $signals; do
                # 检查是否有 <==, ===, 或在组件中使用
                if ! grep -q "$signal.*<==\|$signal.*===\|<==.*$signal\|===.*$signal\|\.$signal" "$file"; then
                    echo "    ⚠️  Warning: Signal '$signal' may be unconstrained"
                    # 注意：这是简化检查，实际需要更复杂的分析
                fi
            done
        fi
    done
fi

echo "ℹ️  Note: Constraint analysis is basic. Manual review is still required."

if [ $FOUND_ISSUES -eq 0 ]; then
    echo "✅ No obvious constraint issues found"
    exit 0
else
    echo "❌ Found $FOUND_ISSUES potential issue(s)"
    exit 1
fi
