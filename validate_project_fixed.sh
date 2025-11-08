#!/bin/bash

# 设置环境变量和配置
set -euo pipefail
REPORT_FILE="validation_report.json"
LOG_DIR="logs"
RESULTS=()

# 创建日志目录
mkdir -p "$LOG_DIR"

# 辅助函数：记录步骤结果
record_step() {
    local step_name="$1"
    local status="$2"
    local stdout="$3"
    local stderr="$4"
    local extra_info="$5"
    
    RESULTS+=("{\"step\": \"$step_name\", \"ok\": $status, \"stdout\": \"${stdout//\"/\\\"}\", \"stderr\": \"${stderr//\"/\\\"}\"${extra_info}}")
}

# 辅助函数：运行命令并捕获输出（不使用timeout）
run_command() {
    local cmd="$1"
    local step_name="$2"
    
    echo "执行步骤: $step_name"
    echo "命令: $cmd"
    
    local start_time=$(date +%s)
    local output=""
    local exit_code=0
    
    # 运行命令（不使用timeout）
    if output=$(bash -c "$cmd" 2>&1); then
        exit_code=0
    else
        exit_code=$?
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo "执行时间: ${duration}秒"
    echo "退出码: $exit_code"
    
    # 分离stdout和stderr（简化处理）
    local stdout="$output"
    local stderr=""
    
    if [ $exit_code -ne 0 ]; then
        stderr="$output"
    fi
    
    record_step "$step_name" "$([ $exit_code -eq 0 ] && echo true || echo false)" "$stdout" "$stderr" ""
    
    return $exit_code
}

# 步骤1：克隆仓库
step_clone() {
    run_command "
        git clone https://github.com/osins/zkp-project.git zkp-project-temp && \
        cd zkp-project-temp && \
        git rev-parse --abbrev-ref HEAD && \
        ls -la
    " "clone"
}

# 步骤2：检查全局依赖
step_check_deps() {
    # 记录版本信息
    run_command "
        echo 'Node.js版本:' && node -v && \
        echo 'npm版本:' && npm -v && \
        echo 'Rust版本:' && cargo -V && \
        echo 'wasm-pack版本:' && (wasm-pack --version || echo '未安装') && \
        echo 'Circom版本:' && circom --version && \
        echo 'snarkjs版本:' && (snarkjs --version || echo '未安装')
    " "check_deps"
}

# 步骤3：构建Circom电路
step_build_circom() {
    run_command "
        cd zkp-project-temp/circom-circuits && \
        npm ci 2>&1 || npm install 2>&1 && \
        bash scripts/build_circuit.sh 2>&1 && \
        ls -la build/
    " "build_circom"
}

# 步骤4：编译Rust prover
step_build_rust() {
    run_command "
        cd zkp-project-temp/rust-prover && \
        cargo build --release 2>&1 && \
        wasm-pack build --target nodejs --out-dir wasm/pkg 2>&1 && \
        ls -la wasm/pkg/
    " "build_rust_wasm"
}

# 步骤5：生成proof
step_generate_proof() {
    run_command "
        cd zkp-project-temp/node-sdk && \
        npm ci 2>&1 || npm install 2>&1 && \
        npx ts-node scripts/generateProof.ts 2>&1
    " "generate_proof"
}

# 步骤6：部署合约
step_deploy_contract() {
    # 启动Hardhat节点（后台运行）
    run_command "
        cd zkp-project-temp/smart-contracts && \
        npm ci 2>&1 || npm install 2>&1 && \
        npx hardhat node --port 8545 > ../../logs/hardhat_node.log 2>&1 &
    " "start_hardhat"
    
    sleep 5
    
    # 部署合约
    run_command "
        cd zkp-project-temp/smart-contracts && \
        node scripts/deploy.js 2>&1
    " "deploy_verifier"
}

# 步骤7：提交proof到链上
step_submit_proof() {
    run_command "
        cd zkp-project-temp/node-sdk && \
        npx ts-node scripts/verify-on-chain.js 2>&1
    " "submit_proof"
}

# 步骤8：链下验证
step_offchain_verify() {
    run_command "
        cd zkp-project-temp/circom-circuits/build && \
        snarkjs groth16 verify verification_key.json public.json proof.json 2>&1
    " "offchain_verify"
}

# 主执行函数
main() {
    echo "=== ZKP项目自动化验证 ==="
    echo "开始时间: $(date)"
    
    # 执行所有步骤
    step_clone || echo "克隆步骤失败，继续后续步骤"
    step_check_deps || echo "依赖检查步骤失败"
    step_build_circom || echo "Circom构建失败"
    step_build_rust || echo "Rust构建失败"
    step_generate_proof || echo "Proof生成失败"
    step_deploy_contract || echo "合约部署失败"
    step_submit_proof || echo "Proof提交失败"
    step_offchain_verify || echo "链下验证失败"
    
    # 生成最终报告
    generate_report
    
    echo "验证完成，报告已保存到: $REPORT_FILE"
}

# 生成JSON报告
generate_report() {
    # 获取commit信息
    local commit_hash=""
    if [ -d "zkp-project-temp" ]; then
        commit_hash=$(cd zkp-project-temp && git rev-parse HEAD 2>/dev/null || echo "unknown")
    fi
    
    # 获取环境版本信息
    local env_info=$(cat <<EOF
{
  "node": "$(node -v 2>/dev/null || echo 'unknown')",
  "npm": "$(npm -v 2>/dev/null || echo 'unknown')",
  "cargo": "$(cargo -V 2>/dev/null || echo 'unknown')",
  "wasm-pack": "$(wasm-pack --version 2>/dev/null || echo 'unknown')",
  "circom": "$(circom --version 2>/dev/null || echo 'unknown')",
  "snarkjs": "$(snarkjs --version 2>/dev/null || echo 'unknown')"
}
EOF
)
    
    # 确定最终可用性
    local available=true
    local notes=""
    
    # 检查关键步骤是否成功
    local proof_generated=false
    local deployed=false
    local verified=false
    
    for result in "${RESULTS[@]}"; do
        if echo "$result" | grep -q '"step": "generate_proof"' && echo "$result" | grep -q '"ok": true'; then
            proof_generated=true
        fi
        if echo "$result" | grep -q '"step": "deploy_verifier"' && echo "$result" | grep -q '"ok": true'; then
            deployed=true
        fi
        if echo "$result" | grep -q '"step": "submit_proof"' && echo "$result" | grep -q '"ok": true'; then
            verified=true
        fi
    done
    
    if [ "$proof_generated" = true ] && [ "$deployed" = true ] && [ "$verified" = true ]; then
        available=true
        notes="所有关键步骤验证通过"
    else
        available=false
        notes="关键步骤验证失败"
    fi
    
    # 构建最终JSON
    cat > "$REPORT_FILE" <<EOF
{
  "repo": "https://github.com/osins/zkp-project",
  "commit": "$commit_hash",
  "env": $env_info,
  "steps": [
EOF
    
    # 添加所有步骤结果
    for i in "${!RESULTS[@]}"; do
        echo "    ${RESULTS[$i]}" >> "$REPORT_FILE"
        if [ $i -lt $((${#RESULTS[@]} - 1)) ]; then
            echo "," >> "$REPORT_FILE"
        fi
    done
    
    cat >> "$REPORT_FILE" <<EOF
  ],
  "final": {
    "available": $available,
    "notes": "$notes"
  }
}
EOF
}

# 执行主函数
main "$@"