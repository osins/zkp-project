#!/bin/bash

# 检查生产目录中是否有废弃电路

set -e

echo "⚠️  Checking for deprecated circuits in production..."

FOUND_ISSUES=0

if [ -d "circuits/production" ]; then
    # 检查文件名
    if ls circuits/production/DEPRECATED_* 2>/dev/null; then
        echo "❌ Error: Deprecated circuits found in production directory!"
        FOUND_ISSUES=$((FOUND_ISSUES + 1))
    fi
    
    # 检查文件内容中的废弃标记
    for file in circuits/production/*.circom; do
        if [ -f "$file" ]; then
            if grep -q "DEPRECATED\|BROKEN\|INSECURE\|DO_NOT_USE" "$file"; then
                echo "❌ Error: Deprecated markers found in production circuit: $file"
                FOUND_ISSUES=$((FOUND_ISSUES + 1))
            fi
        fi
    done
fi

if [ $FOUND_ISSUES -eq 0 ]; then
    echo "✅ No deprecated circuits in production"
    exit 0
else
    echo "❌ Found $FOUND_ISSUES issue(s)"
    echo ""
    echo "Deprecated circuits must be in circuits/examples/ with DEPRECATED_ prefix"
    exit 1
fi
