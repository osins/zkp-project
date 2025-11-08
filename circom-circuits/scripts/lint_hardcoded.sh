#!/bin/bash

# 检查硬编码值的脚本

set -e

echo "🔍 Checking for hardcoded values in circuits..."

FOUND_ISSUES=0

# 检查生产电路
if [ -d "circuits/production" ]; then
    echo "Checking production circuits..."
    
    for file in circuits/production/*.circom; do
        if [ -f "$file" ]; then
            # 检查硬编码的非 0/1 常量
            if grep -n "<== [0-9]\{2,\}" "$file" 2>/dev/null; then
                echo "❌ Hardcoded value found in $file"
                FOUND_ISSUES=$((FOUND_ISSUES + 1))
            fi
            
            if grep -n "=== [0-9]\{2,\}" "$file" 2>/dev/null; then
                echo "❌ Hardcoded value found in $file"
                FOUND_ISSUES=$((FOUND_ISSUES + 1))
            fi
        fi
    done
fi

if [ $FOUND_ISSUES -eq 0 ]; then
    echo "✅ No hardcoded values found"
    exit 0
else
    echo "❌ Found $FOUND_ISSUES issue(s)"
    exit 1
fi
