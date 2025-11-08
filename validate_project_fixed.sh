#!/bin/bash

# 设置环境变量和配置（移除 -e 以支持错误继续）
set -uo pipefail
REPORT_DIR="reports"
LOG_DIR="logs"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
REPORT_FILE="${REPORT_DIR}/${TIMESTAMP}_validation_report.yaml"
RESULTS=()
HARDHAT_PID=""

# 创建日志和报告目录
mkdir -p "$LOG_DIR"
mkdir -p "$REPORT_DIR"

# 清理函数
cleanup() {
    echo ""
    echo "🧹 清理环境..."
    if [ -n "$HARDHAT_PID" ] && kill -0 "$HARDHAT_PID" 2>/dev/null; then
        echo "停止 Hardhat 节点 (PID: $HARDHAT_PID)"
        kill "$HARDHAT_PID" 2>/dev/null || true
    fi
    pkill -f "hardhat node" 2>/dev/null || true
}
trap cleanup EXIT

# 辅助函数：记录步骤结果
record_step() {
    local step_name="$1"
    local status="$2"
    local output_text="$3"
    local error_text="$4"
    
    # 存储步骤信息到数组
    RESULTS+=("$step_name|$status|$output_text|$error_text")
}

# 辅助函数：转义 YAML 字符串
escape_yaml() {
    local str="$1"
    # 截断过长的输出（最多 500 字符）
    if [ ${#str} -gt 500 ]; then
        str="${str:0:500}... (truncated)"
    fi
    # 移除特殊字符
    str=$(echo "$str" | tr -d '\000-\010\013-\037')
    echo "$str"
}

# 辅助函数：运行命令并捕获输出
run_command() {
    local cmd="$1"
    local step_name="$2"
    local timeout_seconds="${3:-600}"
    
    echo ""
    echo "▶️  执行步骤: $step_name"
    echo "📝 命令: $cmd"
    
    local start_time=$(date +%s)
    local output=""
    local exit_code=0
    
    # 运行命令
    if command -v timeout >/dev/null 2>&1; then
        if output=$(timeout "$timeout_seconds" bash -c "$cmd" 2>&1); then
            exit_code=0
        else
            exit_code=$?
            if [ $exit_code -eq 124 ]; then
                output="命令超时（${timeout_seconds}秒）"
            fi
        fi
    else
        if output=$(bash -c "$cmd" 2>&1); then
            exit_code=0
        else
            exit_code=$?
        fi
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # 显示结果
    if [ $exit_code -eq 0 ]; then
        echo "✅ 成功 (耗时: ${duration}秒)"
    else
        echo "❌ 失败 (退出码: $exit_code, 耗时: ${duration}秒)"
    fi
    
    # 记录结果
    local stdout_text=""
    local stderr_text=""
    
    if [ $exit_code -eq 0 ]; then
        stdout_text="$output"
    else
        stderr_text="$output"
    fi
    
    record_step "$step_name" "$([ $exit_code -eq 0 ] && echo true || echo false)" "$stdout_text" "$stderr_text"
    
    return $exit_code
}

# 前置检查
preflight_check() {
    echo "🔍 前置检查..."
    
    # 检查是否在项目根目录
    if [ ! -f "package.json" ] || [ ! -d "circom-circuits" ]; then
        echo "❌ 错误: 请在项目根目录运行此脚本"
        exit 1
    fi
    
    # 检查必需的命令
    local missing_deps=()
    for cmd in node npm git; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            missing_deps+=("$cmd")
        fi
    done
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        echo "❌ 缺少必需依赖: ${missing_deps[*]}"
        echo "请先安装这些依赖"
        exit 1
    fi
    
    echo "✅ 前置检查通过"
}

# 步骤1：验证项目结构
step_check_project() {
    run_command "
        echo '当前项目结构:' && \
        ls -la && \
        echo '' && \
        echo 'git信息:' && \
        git rev-parse --abbrev-ref HEAD && \
        git status --short
    " "check_project" 30
}

# 步骤2：检查全局依赖
step_check_deps() {
    run_command "
        echo 'Node.js: ' && node -v && \
        echo 'npm: ' && npm -v && \
        echo 'Rust: ' && cargo -V && \
        echo 'wasm-pack: ' && (wasm-pack --version || echo 'not installed') && \
        echo 'Circom: ' && (circom --version || echo 'not installed') && \
        echo 'snarkjs: ' && (snarkjs --version 2>&1 | head -1 || echo 'not installed')
    " "check_deps" 60
}

# 步骤3：构建Circom电路
step_build_circom() {
    run_command "
        cd circom-circuits && \
        (npm ci 2>&1 || npm install 2>&1) && \
        bash scripts/build_circuit.sh 2>&1 && \
        echo '' && \
        echo '生成的文件:' && \
        ls -lh build/ 2>&1
    " "build_circom" 600
}

# 步骤4：编译Rust prover
step_build_rust() {
    run_command "
        cd rust-prover && \
        cargo build --release 2>&1 && \
        wasm-pack build --target nodejs --out-dir wasm/pkg 2>&1 && \
        echo '' && \
        echo '生成的文件:' && \
        ls -lh wasm/pkg/ 2>&1
    " "build_rust_wasm" 600
}

# 步骤5：生成proof
step_generate_proof() {
    run_command "
        cd node-sdk && \
        (npm ci 2>&1 || npm install 2>&1) && \
        npx ts-node scripts/generateProof.ts 2>&1
    " "generate_proof" 300
}

# 步骤6：部署合约
step_deploy_contract() {
    echo ""
    echo "▶️  启动 Hardhat 节点..."
    
    cd smart-contracts || return 1
    (npm ci 2>&1 || npm install 2>&1) > "$LOG_DIR/smart_contracts_install.log" 2>&1
    
    # 启动 Hardhat 节点
    npx hardhat node --port 8545 > "../$LOG_DIR/hardhat_node.log" 2>&1 &
    HARDHAT_PID=$!
    cd ..
    
    echo "Hardhat PID: $HARDHAT_PID"
    
    # 等待节点就绪（最多 30 秒）
    local max_attempts=30
    local attempt=0
    echo -n "等待 Hardhat 节点启动"
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -X POST -H "Content-Type: application/json" \
            --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            http://localhost:8545 >/dev/null 2>&1; then
            echo " ✅"
            break
        fi
        echo -n "."
        sleep 1
        ((attempt++))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        echo " ❌"
        echo "Hardhat 节点启动超时"
        record_step "start_hardhat" "false" "" "Hardhat 节点启动超时"
        return 1
    fi
    
    record_step "start_hardhat" "true" "Hardhat 节点已启动 (PID: $HARDHAT_PID)" ""
    
    # 部署合约
    run_command "
        cd smart-contracts && \
        node scripts/deploy.js 2>&1
    " "deploy_verifier" 300
}

# 步骤7：链下验证
step_offchain_verify() {
    run_command "
        cd circom-circuits/build && \
        snarkjs groth16 verify verification_key.json public.json proof.json 2>&1
    " "offchain_verify" 60
}

# 步骤8：链上验证（可选）
step_onchain_verify() {
    # 检查链上验证脚本是否存在
    if [ ! -f "node-sdk/scripts/verify-on-chain.js" ]; then
        echo "⚠️  链上验证脚本不存在，跳过"
        record_step "onchain_verify" "true" "脚本不存在，跳过" ""
        return 0
    fi
    
    run_command "
        cd node-sdk && \
        npx ts-node scripts/verify-on-chain.js 2>&1
    " "onchain_verify" 300
}

# 生成YAML报告
generate_report() {
    echo ""
    echo "📊 生成验证报告..."
    
    local commit_hash=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    
    # 检查关键步骤
    local circom_ok=false
    local proof_ok=false
    local deploy_ok=false
    local verify_ok=false
    
    for result in "${RESULTS[@]}"; do
        local step_name=$(echo "$result" | cut -d'|' -f1)
        local status=$(echo "$result" | cut -d'|' -f2)
        
        [ "$step_name" = "build_circom" ] && [ "$status" = "true" ] && circom_ok=true
        [ "$step_name" = "generate_proof" ] && [ "$status" = "true" ] && proof_ok=true
        [ "$step_name" = "deploy_verifier" ] && [ "$status" = "true" ] && deploy_ok=true
        [ "$step_name" = "offchain_verify" ] && [ "$status" = "true" ] && verify_ok=true
    done
    
    # 判断整体可用性
    local available=false
    local notes=""
    
    if [ "$circom_ok" = true ] && [ "$proof_ok" = true ] && [ "$verify_ok" = true ]; then
        available=true
        notes="核心功能验证通过（Circom 电路、证明生成、验证）"
    else
        notes="部分关键步骤失败 - Circom:$circom_ok Proof:$proof_ok Verify:$verify_ok"
    fi
    
    # 写入 YAML 报告
    cat > "$REPORT_FILE" <<EOF
# ZKP 项目验证报告
# 生成时间: $(date)
# 执行者: $(whoami)
---
repo: "https://github.com/osins/zkp-project"
commit: "$commit_hash"
timestamp: "$TIMESTAMP"

env:
  node: "$(node -v 2>/dev/null || echo 'N/A')"
  npm: "$(npm -v 2>/dev/null || echo 'N/A')"
  cargo: "$(cargo -V 2>/dev/null | cut -d' ' -f2 || echo 'N/A')"
  wasm-pack: "$(wasm-pack --version 2>/dev/null | cut -d' ' -f2 || echo 'N/A')"
  circom: "$(circom --version 2>/dev/null || echo 'N/A')"
  snarkjs: "$(snarkjs --version 2>&1 | head -1 | cut -d'@' -f2 || echo 'N/A')"
  os: "$(uname -s)"

steps:
EOF
    
    # 添加步骤结果
    for result in "${RESULTS[@]}"; do
        local step_name=$(echo "$result" | cut -d'|' -f1)
        local status=$(echo "$result" | cut -d'|' -f2)
        local stdout=$(echo "$result" | cut -d'|' -f3)
        local stderr=$(echo "$result" | cut -d'|' -f4)
        
        # 转义和截断输出
        stdout=$(escape_yaml "$stdout")
        stderr=$(escape_yaml "$stderr")
        
        cat >> "$REPORT_FILE" <<EOF
  - step: "$step_name"
    ok: $status
    stdout: |
      $(echo "$stdout" | sed 's/^/      /')
    stderr: |
      $(echo "$stderr" | sed 's/^/      /')
EOF
    done
    
    cat >> "$REPORT_FILE" <<EOF

summary:
  total_steps: ${#RESULTS[@]}
  passed_steps: $(for r in "${RESULTS[@]}"; do echo "$r" | cut -d'|' -f2; done | grep -c "true")
  failed_steps: $(for r in "${RESULTS[@]}"; do echo "$r" | cut -d'|' -f2; done | grep -c "false")

final:
  available: $available
  notes: "$notes"
EOF
    
    echo "✅ 报告已保存: $REPORT_FILE"
}

# 主执行函数
main() {
    echo "╔════════════════════════════════════════╗"
    echo "║   ZKP 项目自动化验证                   ║"
    echo "╚════════════════════════════════════════╝"
    echo "开始时间: $(date)"
    echo ""
    
    # 前置检查
    preflight_check
    
    # 执行所有步骤（使用 set +e 允许失败后继续）
    set +e
    
    step_check_project
    step_check_deps
    step_build_circom
    step_build_rust
    
    # 如果 Circom 构建失败，跳过后续步骤
    local circom_result=$?
    if [ $circom_result -ne 0 ]; then
        echo ""
        echo "⚠️  Circom 构建失败，跳过证明生成和验证步骤"
    else
        step_generate_proof
        step_deploy_contract
        step_offchain_verify
        step_onchain_verify
    fi
    
    set -e
    
    # 生成报告
    echo ""
    echo "════════════════════════════════════════"
    generate_report
    
    echo ""
    echo "验证完成时间: $(date)"
    echo "════════════════════════════════════════"
}

# 执行主函数
main "$@"
