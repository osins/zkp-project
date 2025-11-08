#!/bin/bash

set -e

# 定义日志文件目录
LOGS_DIR="logs"
REPORT_FILE="enhanced_validation_report.json"

# 创建日志目录
mkdir -p "$LOGS_DIR"

# 初始化验证报告
cat > "$REPORT_FILE" << 'EOF'
{
  "repo": "https://github.com/osins/zkp-project",
  "commit": "",
  "env": {},
  "steps": [],
  "final": {
    "available": false,
    "notes": ""
  }
}
EOF

# 函数：添加步骤到报告
add_step() {
    local step_name="$1"
    local ok="$2"
    local stdout="$3"
    local stderr="$4"
    
    # 转义JSON特殊字符
    stdout=$(echo "$stdout" | sed 's/"/\\"/g' | sed 's/$/\\n/' | tr -d '\n')
    stderr=$(echo "$stderr" | sed 's/"/\\"/g' | sed 's/$/\\n/' | tr -d '\n')
    
    # 使用jq添加步骤
    jq --arg step "$step_name" \
       --argjson ok "$ok" \
       --arg stdout "$stdout" \
       --arg stderr "$stderr" \
       '.steps += [{"step": $step, "ok": $ok, "stdout": $stdout, "stderr": $stderr}]' \
       "$REPORT_FILE" > "$REPORT_FILE.tmp" && mv "$REPORT_FILE.tmp" "$REPORT_FILE"
}

# 函数：执行命令并记录结果
run_command() {
    local step_name="$1"
    local cmd="$2"
    local log_file="$LOGS_DIR/${step_name//[^a-zA-Z0-9]/_}.log"
    
    echo "=== 执行步骤: $step_name ==="
    echo "命令: $cmd"
    
    # 执行命令并捕获输出
    if stdout=$(eval "$cmd" 2>"${log_file}.stderr"); then
        stderr=$(cat "${log_file}.stderr")
        add_step "$step_name" true "$stdout" "$stderr"
        echo "✅ 成功"
    else
        stderr=$(cat "${log_file}.stderr")
        add_step "$step_name" false "$stdout" "$stderr"
        echo "❌ 失败"
        echo "错误信息: $stderr"
        # 不立即退出，继续执行后续步骤
    fi
    
    echo ""
}

# 设置提交信息
COMMIT_HASH=$(cd /Users/shaoyingwang/works/codes/DigitalAssetsProject/zkp-project && git rev-parse HEAD)
jq --arg commit "$COMMIT_HASH" '.commit = $commit' "$REPORT_FILE" > "$REPORT_FILE.tmp" && mv "$REPORT_FILE.tmp" "$REPORT_FILE"

# 1. 清理和重新克隆项目（如果需要）
echo "步骤1: 清理现有项目并重新克隆"
if [ -d "zkp-project-temp" ]; then
    echo "清理现有项目..."
    rm -rf "zkp-project-temp"
fi

run_command "clone" "git clone https://github.com/osins/zkp-project.git zkp-project-temp"

# 2. 检查环境依赖
run_command "check_deps" "echo 'Node.js版本:' && node -v && echo 'npm版本:' && npm -v && echo 'Rust版本:' && cargo -V && echo 'Circom版本:' && circom --version"

# 3. 安装缺失的依赖
run_command "install_snarkjs" "npm install -g snarkjs"
run_command "install_wasm_pack" "curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh"

# 4. 修复Rust prover
run_command "fix_rust_prover" "cd zkp-project-temp/rust-prover && mv src/main.rs src/lib.rs"

# 5. 清理npm依赖并重新安装
run_command "clean_npm_deps" "cd zkp-project-temp && rm -rf node_modules package-lock.json"

# 6. 构建Circom电路
run_command "build_circom" "cd zkp-project-temp/circom-circuits && npm install && npm run build"

# 7. 构建Rust WASM
run_command "build_rust_wasm" "cd zkp-project-temp/rust-prover && cargo build --release && wasm-pack build --target nodejs --out-dir wasm/pkg"

# 8. 安装Node SDK依赖
run_command "install_node_sdk" "cd zkp-project-temp/node-sdk && npm install"

# 9. 生成证明
run_command "generate_proof" "cd zkp-project-temp/node-sdk && npm run generate-proof"

# 10. 编译Solidity合约
run_command "compile_contracts" "cd zkp-project-temp/smart-contracts && npx hardhat compile"

# 11. 启动Hardhat节点
run_command "start_hardhat" "cd zkp-project-temp/smart-contracts && npx hardhat node --port 8545 > ../../logs/hardhat_node.log 2>&1 & sleep 10"

# 12. 部署智能合约
run_command "deploy_verifier" "cd zkp-project-temp/smart-contracts && node scripts/deploy.js"

# 13. 验证链上证明
run_command "submit_proof" "cd zkp-project-temp/node-sdk && npm run verify-on-chain"

# 14. 链下验证
run_command "offchain_verify" "cd zkp-project-temp/circom-circuits/build && snarkjs groth16 verify verification_key.json public.json proof.json"

# 15. 更新环境信息
ENV_INFO=$(echo "{\"node\": \"$(node -v)\", \"npm\": \"$(npm -v)\", \"cargo\": \"$(cargo -V)\", \"wasm-pack\": \"$(wasm-pack --version 2>/dev/null || echo 'unknown')\", \"circom\": \"$(circom --version)\", \"snarkjs\": \"$(snarkjs --version 2>/dev/null || echo 'unknown')\"}")
jq --argjson env "$ENV_INFO" '.env = $env' "$REPORT_FILE" > "$REPORT_FILE.tmp" && mv "$REPORT_FILE.tmp" "$REPORT_FILE"

# 16. 最终评估
# 计算成功步骤数量
SUCCESS_COUNT=$(jq '.steps | map(select(.ok == true)) | length' "$REPORT_FILE")
TOTAL_COUNT=$(jq '.steps | length' "$REPORT_FILE")

if [ "$SUCCESS_COUNT" -eq "$TOTAL_COUNT" ]; then
    jq '.final.available = true | .final.notes = "所有步骤验证成功"' "$REPORT_FILE" > "$REPORT_FILE.tmp" && mv "$REPORT_FILE.tmp" "$REPORT_FILE"
else
    jq --arg notes "成功 $SUCCESS_COUNT/$TOTAL_COUNT 个步骤，需要修复失败步骤" '.final.available = false | .final.notes = $notes' "$REPORT_FILE" > "$REPORT_FILE.tmp" && mv "$REPORT_FILE.tmp" "$REPORT_FILE"
fi

echo "=== 验证完成 ==="
echo "验证报告已保存到: $REPORT_FILE"
echo "成功步骤: $SUCCESS_COUNT/$TOTAL_COUNT"