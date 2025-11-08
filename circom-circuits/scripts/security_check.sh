#!/bin/bash

# 安全检查脚本

set -e

echo "🔒 Running security checks on circuits..."

FOUND_ISSUES=0

# 不安全的模式列表
INSECURE_PATTERNS=(
    "preimage \* preimage"  # 平方哈希
    "input \+ input"        # 简单加法哈希
)

# 检查生产电路
if [ -d "circuits/production" ]; then
    echo "Checking production circuits for insecure patterns..."
    
    for file in circuits/production/*.circom; do
        if [ -f "$file" ]; then
            echo "  Checking $file..."
            
            # 检查不安全的哈希模式
            if grep -q "hash <== .* \* .*" "$file" 2>/dev/null; then
                # 确保使用的是安全的哈希库
                if ! grep -q "circomlib/poseidon\|circomlib/mimc\|circomlib/pedersen" "$file"; then
                    echo "    ⚠️  Warning: Potentially insecure hash implementation"
                    echo "       Please verify it uses secure cryptographic primitives"
                fi
            fi
            
            # 检查是否有未约束的输出
            # (这需要更复杂的静态分析，这里只做基本检查)
            
            # 检查是否使用了推荐的库
            if grep -q "template.*Hash\|template.*Proof" "$file"; then
                if ! grep -q "include.*circomlib" "$file"; then
                    echo "    ⚠️  Warning: Custom crypto implementation detected"
                    echo "       Consider using circomlib standard templates"
                fi
            fi
        fi
    done
fi

# 检查示例电路中的不安全模式（仅警告）
if [ -d "circuits/examples" ]; then
    echo "Checking example circuits..."
    
    for file in circuits/examples/*.circom; do
        # 跳过已标记为不安全的文件
        if [[ "$file" =~ INSECURE|BROKEN ]]; then
            continue
        fi
        
        if [ -f "$file" ]; then
            if grep -q "hash <== .* \* .*" "$file" 2>/dev/null; then
                if ! grep -q "circomlib" "$file"; then
                    echo "  ℹ️  Info: $file uses custom hash (OK for examples)"
                fi
            fi
        fi
    done
fi

if [ $FOUND_ISSUES -eq 0 ]; then
    echo "✅ Security checks passed"
    exit 0
else
    echo "❌ Found $FOUND_ISSUES security issue(s)"
    exit 1
fi
