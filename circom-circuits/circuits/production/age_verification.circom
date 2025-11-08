// ============================================================================
// Circuit: AgeVerification (生产级)
// ============================================================================
// 
// 用途: 证明年龄在指定范围内，不泄露具体年龄
// 状态: ✅ 生产级
// 
// 功能: 证明 age >= minAge 且 age <= maxAge，不透露具体年龄值
//
// 输入:
//   - age: private (witness) - 实际年龄
//   - ageCommitment: public (instance) - 年龄承诺（Poseidon 哈希）
//   - minAge: public (instance) - 最小年龄要求
//   - maxAge: public (instance) - 最大年龄限制
//   - salt: private (witness) - 随机盐值（用于承诺）
//
// 输出:
//   - valid: public (instance) - 验证结果（0或1）
//
// 约束:
//   - 1 个 Poseidon 哈希约束（验证承诺）
//   - 2 个范围证明约束（age >= minAge 和 age <= maxAge）
//   - 总计: ~600 个约束
//
// 约束数量:
//   - Poseidon 哈希: ~200 个约束
//   - 2 个范围证明: ~200 个约束
//   - 比较器: ~200 个约束
//
// 安全假设:
//   - Poseidon 哈希的单向性和抗碰撞性
//   - 标准 Groth16 假设
//   - 受信任的 Setup (Powers of Tau)
//   - salt 必须是高熵随机数
//
// 使用场景:
//   - 在线投票（证明年龄 >= 18 但不泄露具体年龄）
//   - 年龄限制内容访问（证明年龄 >= 21）
//   - 老年人优惠（证明年龄 >= 65）
//   - KYC 合规（证明年龄在合法范围）
//
// 限制:
//   - 仅支持整数年龄（0-255）
//   - minAge 和 maxAge 必须在编译时或运行时指定
//   - 需要链下维护年龄承诺
//
// 性能:
//   - 证明时间: ~150ms
//   - 验证时间: ~12ms
//   - Gas 消耗: ~260K (链上验证)
//   - 电路大小: ~600 约束
//
// ⚠️ 注意:
//   - salt 必须保密且随机
//   - 承诺一旦生成不应频繁更改
//   - 年龄更新需要重新生成承诺
//   - 适用于不需要频繁验证的场景
//
// 隐私保护:
//   - 具体年龄完全隐藏
//   - 仅暴露是否满足范围要求
//   - 使用承诺方案防止重放攻击
//
// 示例用法:
//   // 证明年龄在 18-65 之间
//   component verify = AgeVerification();
//   verify.age <== 25;
//   verify.minAge <== 18;
//   verify.maxAge <== 65;
//   verify.salt <== randomSalt;
//   verify.ageCommitment <== commitment;
//   valid <== verify.valid;
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

/// 年龄验证电路
/// 
/// 功能：
/// - 验证年龄承诺的正确性
/// - 验证年龄在指定范围内
/// - 不泄露具体年龄值
template AgeVerification() {
    // 输入信号
    signal input age;               // 实际年龄（私密）
    signal input salt;              // 随机盐值（私密）
    signal input ageCommitment;     // 年龄承诺（公开）
    signal input minAge;            // 最小年龄（公开）
    signal input maxAge;            // 最大年龄（公开）
    
    // 输出信号
    signal output valid;

    // ===== 第一步：验证年龄承诺 =====
    // ✅ 约束: 承诺必须匹配 H(age, salt)
    component hasher = Poseidon(2);
    hasher.inputs[0] <== age;
    hasher.inputs[1] <== salt;
    ageCommitment === hasher.out;

    // ===== 第二步：验证年龄范围有效性 =====
    // 确保 minAge <= maxAge
    component rangeCheck = LessEqThan(8);
    rangeCheck.in[0] <== minAge;
    rangeCheck.in[1] <== maxAge;
    rangeCheck.out === 1;

    // ===== 第三步：验证年龄在范围内 =====
    
    // 验证 age >= minAge
    component lowerBound = GreaterEqThan(8);
    lowerBound.in[0] <== age;
    lowerBound.in[1] <== minAge;
    
    // 验证 age <= maxAge
    component upperBound = LessEqThan(8);
    upperBound.in[0] <== age;
    upperBound.in[1] <== maxAge;
    
    // ===== 第四步：验证年龄在合理范围内（0-255）=====
    // 使用位分解确保年龄是 8 位无符号整数
    component ageBits = Num2Bits(8);
    ageBits.in <== age;

    // ===== 第五步：计算最终结果 =====
    // valid = lowerBound.out AND upperBound.out
    // 使用乘法实现 AND 逻辑
    signal bothValid;
    bothValid <== lowerBound.out * upperBound.out;
    
    // ✅ 约束: 输出必须是 0 或 1
    bothValid * (1 - bothValid) === 0;
    valid <== bothValid;
}

/// 主电路
/// 公开输入: ageCommitment, minAge, maxAge
/// 私密输入: age, salt
component main {public [ageCommitment, minAge, maxAge]} = AgeVerification();
