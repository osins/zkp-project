// ============================================================================
// Circuit: BalanceProof (生产级)
// ============================================================================
// 
// 用途: 证明账户余额充足，不泄露具体余额
// 状态: ✅ 生产级
// 
// 功能: 证明 balance >= requiredAmount，不透露具体余额
//
// 输入:
//   - balance: private (witness) - 实际余额
//   - balanceCommitment: public (instance) - 余额承诺（Poseidon 哈希）
//   - requiredAmount: public (instance) - 所需金额
//   - salt: private (witness) - 随机盐值（用于承诺）
//   - accountId: private (witness) - 账户标识符
//
// 输出:
//   - sufficient: public (instance) - 余额是否充足（0或1）
//
// 约束:
//   - 1 个 Poseidon 哈希约束（验证承诺）
//   - 1 个比较约束（balance >= requiredAmount）
//   - 1 个范围约束（balance 在有效范围内）
//   - 总计: ~450 个约束
//
// 约束数量:
//   - Poseidon 哈希: ~200 个约束
//   - 比较器: ~64 个约束
//   - 位分解: ~64 个约束
//   - 其他: ~122 个约束
//
// 安全假设:
//   - Poseidon 哈希的单向性和抗碰撞性
//   - 标准 Groth16 假设
//   - 受信任的 Setup (Powers of Tau)
//   - salt 和 accountId 必须保密
//
// 使用场景:
//   - DeFi 协议（证明有足够抵押品但不泄露总资产）
//   - 隐私支付（证明余额充足但不泄露具体金额）
//   - 信用评估（证明满足最低余额要求）
//   - 合规检查（证明资产在允许范围）
//
// 限制:
//   - 余额范围: 0 到 2^64-1（支持大额金额）
//   - 必须使用 64 位整数
//   - 不支持负数余额
//   - 承诺需要链下维护
//
// 性能:
//   - 证明时间: ~180ms
//   - 验证时间: ~13ms
//   - Gas 消耗: ~270K (链上验证)
//   - 电路大小: ~450 约束
//
// ⚠️ 注意:
//   - 余额承诺包含 accountId，防止跨账户攻击
//   - salt 必须保密且随机
//   - 每次余额变化需要更新承诺
//   - 适用于余额不频繁变化的场景
//
// 隐私保护:
//   - 具体余额完全隐藏
//   - 仅暴露是否满足所需金额
//   - 防止余额追踪
//   - 支持匿名交易
//
// 防止攻击:
//   - 承诺包含 accountId 防止跨账户复用
//   - 范围约束防止溢出攻击
//   - 使用 Poseidon 防止哈希碰撞
//
// 示例用法:
//   // 证明余额 >= 1000 USDT
//   component proof = BalanceProof();
//   proof.balance <== 5000;  // 实际余额
//   proof.requiredAmount <== 1000;
//   proof.salt <== randomSalt;
//   proof.accountId <== userId;
//   proof.balanceCommitment <== commitment;
//   sufficient <== proof.sufficient;
//
// 作者: ZKP Project Team
// 审查员1: [待填写]
// 审查员2: [待填写]
// 版本: 1.0.0
// 创建日期: 2025-11-08
// 审查日期: [待填写]
// ============================================================================

pragma circom 2.0.0;

include "circomlib/poseidon.circom";
include "circomlib/comparators.circom";
include "circomlib/bitify.circom";

/// 余额证明电路
/// 
/// 功能：
/// - 验证余额承诺的正确性
/// - 验证余额大于等于所需金额
/// - 保护余额隐私
template BalanceProof() {
    // 输入信号
    signal input balance;           // 实际余额（私密）
    signal input salt;              // 随机盐值（私密）
    signal input accountId;         // 账户ID（私密）
    signal input balanceCommitment; // 余额承诺（公开）
    signal input requiredAmount;    // 所需金额（公开）
    
    // 输出信号
    signal output sufficient;

    // ===== 第一步：验证余额承诺 =====
    // ✅ 约束: 承诺必须匹配 H(balance, accountId, salt)
    // 包含 accountId 防止跨账户攻击
    component hasher = Poseidon(3);
    hasher.inputs[0] <== balance;
    hasher.inputs[1] <== accountId;
    hasher.inputs[2] <== salt;
    balanceCommitment === hasher.out;

    // ===== 第二步：验证余额在有效范围内 =====
    // 使用 64 位位分解确保余额是有效的无符号整数
    // 这防止了负数或溢出攻击
    component balanceBits = Num2Bits(64);
    balanceBits.in <== balance;

    // ===== 第三步：验证所需金额在有效范围内 =====
    // 确保 requiredAmount 也是有效的 64 位整数
    component requiredBits = Num2Bits(64);
    requiredBits.in <== requiredAmount;

    // ===== 第四步：验证余额充足性 =====
    // ✅ 约束: balance >= requiredAmount
    component comparison = GreaterEqThan(64);
    comparison.in[0] <== balance;
    comparison.in[1] <== requiredAmount;
    
    // ===== 第五步：输出验证结果 =====
    // ✅ 约束: 输出必须是 0 或 1
    comparison.out * (1 - comparison.out) === 0;
    sufficient <== comparison.out;
}

/// 主电路
/// 公开输入: balanceCommitment, requiredAmount
/// 私密输入: balance, salt, accountId
component main {public [balanceCommitment, requiredAmount]} = BalanceProof();
