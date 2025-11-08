#!/bin/bash

# 设置环境变量和配置
set -euo pipefail
REPORT_DIR="reports"
LOG_DIR="logs"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
REPORT_FILE="${REPORT_DIR}/${TIMESTAMP}_validation_report.yaml"
RESULTS=()

# 创建日志和报告目录
mkdir -p "$LOG_DIR"
mkdir -p "$REPORT_DIR"

# 辅助函数：记录步骤结果
record_step() {
    local step_name="$1"
    local status="$2"
    local stdout="$3"
    local stderr="$4"
    
    # 存储步骤信息到数组，用于后续生成 YAML
    RESULTS+=("$step_name|$status|$stdout|$stderr")
}

# 辅助函数：转义 YAML 中的特殊字符
escape_yaml_string() {
    local str="$1"
    # 转义双引号、换行符等特殊字符
    str=$(echo "$str" | sed 's/"/\\"/g')
    str=$(echo "$str" | sed 's/\\/\\\\/g')
    echo "$str"
}

# 辅助函数：运行命令并捕获输出
run_command() {
    local cmd="$1"
    local step_name="$2"
    local timeout_seconds="${3:-600}"  # 默认10分钟超时
    
    echo "执行步骤: $step_name"
    echo "命令: $cmd"
    
    local start_time=$(date +%s)
    local output=""
    local exit_code=0
    
    # 检查timeout命令是否存在
    if command -v timeout >/dev/null 2>&1; then
        # 使用timeout运行命令
        if output=$(timeout "$timeout_seconds" bash -c "$cmd" 2>&1); then
            exit_code=0
        else
            exit_code=$?
            if [ $exit_code -eq 124 ]; then
                output="命令超时（${timeout_seconds}秒）"
            fi
        fi
    else
        # 没有timeout命令，直接运行
        if output=$(bash -c "$cmd" 2>&1); then
            exit_code=0
        else
            exit_code=$?
        fi
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo "执行时间: ${duration}秒"
    echo "退出码: $exit_code"
    
    # 分离stdout和stderr（简化处理）
    local stdout="$output"
    local stderr=""
    
    if [ $exit_code -ne 0 ] && [ $exit_code -ne 124 ]; then
        stderr="$output"
    fi
    
    record_step "$step_name" "$([ $exit_code -eq 0 ] && echo true || echo false)" "$stdout" "$stderr"
    
    return $exit_code
}

# 步骤1：验证项目结构
step_check_project() {
    run_command "
        echo '当前项目结构:' && \
        ls -la && \
        echo 'git信息:' && \
        git rev-parse --abbrev-ref HEAD && \
        git status --short
    " "check_project"
}

# 步骤2：检查全局依赖
step_check_deps() {
    # 检查现有依赖
    local deps_output=""
    
    for dep in node npm cargo wasm-pack circom snarkjs; do
        if command -v "$dep" >/dev/null 2>&1; then
            deps_output="$deps_output$dep: $(command -v $dep)\n"
        else
            deps_output="$deps_output$dep: 缺失\n"
        fi
    done
    
    # 记录版本信息
    run_command "
        echo 'Node.js版本:' && node -v && \
        echo 'npm版本:' && npm -v && \
        echo 'Rust版本:' && cargo -V && \
        echo 'wasm-pack版本:' && wasm-pack --version && \
        echo 'Circom版本:' && circom --version && \
        echo 'snarkjs版本:' && snarkjs --version
    " "check_deps" 300
}

# 步骤3：构建Circom电路
step_build_circom() {
    run_command "
        cd circom-circuits && \
        npm ci 2>&1 || npm install 2>&1 && \
        bash scripts/build_circuit.sh 2>&1 && \
        ls -la build/
    " "build_circom" 600
}

# 步骤3：编译Rust prover
step_build_rust() {
    run_command "
        cd rust-prover && \
        cargo build --release 2>&1 && \
        wasm-pack build --target nodejs --out-dir wasm/pkg 2>&1 && \
        ls -la wasm/pkg/
    " "build_rust_wasm" 600
}

# 步骤4：生成proof
step_generate_proof() {
    run_command "
        cd node-sdk && \
        npm ci 2>&1 || npm install 2>&1 && \
        npx ts-node scripts/generateProof.ts 2>&1
    " "generate_proof" 300
}

# 步骤5：部署合约
step_deploy_contract() {
    # 启动Hardhat节点（后台运行）
    run_command "
        cd smart-contracts && \
        npm ci 2>&1 || npm install 2>&1 && \
        npx hardhat node --port 8545 > ../logs/hardhat_node.log 2>&1 &
    " "start_hardhat" 30
    
    sleep 5
    
    # 部署合约
    run_command "
        cd smart-contracts && \
        node scripts/deploy.js 2>&1
    " "deploy_verifier" 300
}

# 步骤6：提交proof到链上
step_submit_proof() {
    run_command "
        cd node-sdk && \
        npx ts-node scripts/verify-on-chain.js 2>&1
    " "submit_proof" 300
}

# 步骤7：链下验证
step_offchain_verify() {
    run_command "
        cd circom-circuits/build && \
        snarkjs groth16 verify verification_key.json public.json proof.json 2>&1
    " "offchain_verify" 300
}

# 主执行函数
main() {
    echo "=== ZKP项目自动化验证 ==="
    echo "开始时间: $(date)"
    
    # 执行所有步骤
    step_check_project || echo "项目结构检查失败，继续后续步骤"
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

# 生成YAML报告
generate_report() {
    # 获取当前项目的commit信息
    local commit_hash=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    
    # 确定最终可用性
    local available=true
    local notes=""
    
    # 检查关键步骤是否成功
    local proof_generated=false
    local deployed=false
    local verified=false
    
    for result in "${RESULTS[@]}"; do
        step_name=$(echo "$result" | cut -d'|' -f1)
        status=$(echo "$result" | cut -d'|' -f2)
        
        if [ "$step_name" = "generate_proof" ] && [ "$status" = "true" ]; then
            proof_generated=true
        fi
        if [ "$step_name" = "deploy_verifier" ] && [ "$status" = "true" ]; then
            deployed=true
        fi
        if [ "$step_name" = "submit_proof" ] && [ "$status" = "true" ]; then
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
    
    # 构建 YAML 报告
    cat > "$REPORT_FILE" <<EOF
# ZKP项目验证报告
# 生成时间: $(date)
---
repo: "https://github.com/osins/zkp-project"
commit: "$commit_hash"
env:
  node: "$(node -v 2>/dev/null || echo 'unknown')"
  npm: "$(npm -v 2>/dev/null || echo 'unknown')"
  cargo: "$(cargo -V 2>/dev/null || echo 'unknown')"
  wasm-pack: "$(wasm-pack --version 2>/dev/null || echo 'unknown')"
  circom: "$(circom --version 2>/dev/null || echo 'unknown')"
  snarkjs: "$(snarkjs --version 2>/dev/null || echo 'unknown')"

steps:
EOF
    
    # 添加所有步骤结果
    for result in "${RESULTS[@]}"; do
        step_name=$(echo "$result" | cut -d'|' -f1)
        status=$(echo "$result" | cut -d'|' -f2)
        stdout=$(echo "$result" | cut -d'|' -f3)
        stderr=$(echo "$result" | cut -d'|' -f4)
        
        # 转义多行文本，使用 | 表示多行文本
        stdout_escaped=$(echo "$stdout" | sed 's/^/  /')
        stderr_escaped=$(echo "$stderr" | sed 's/^/  /')
        
        cat >> "$REPORT_FILE" <<EOF
- step: "$step_name"
  ok: $status
  stdout: |
$stdout_escaped
  stderr: |
$stderr_escaped
EOF
    done
    
    cat >> "$REPORT_FILE" <<EOF

final:
  available: $available
  notes: "$notes"
EOF
}

# 执行主函数
main "$@"