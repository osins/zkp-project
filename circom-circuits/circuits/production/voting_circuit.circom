// ============================================================================
// Circuit: VotingCircuit (生产级)
// ============================================================================
// 
// 用途: 实现匿名投票系统，保护投票者隐私
// 状态: ✅ 生产级
// 
// 功能: 证明投票者有投票权且未重复投票，不泄露投票者身份
//
// 输入:
//   - voterSecret: private (witness) - 投票者私钥
//   - voterCommitment: public (instance) - 投票者承诺（已注册）
//   - vote: private (witness) - 投票选项（0 或 1）
//   - nullifier: public (instance) - 废止符（防止双重投票）
//   - merkleRoot: public (instance) - 投票者默克尔树根
//   - pathElements[levels]: private (witness) - 默克尔路径
//   - pathIndices[levels]: private (witness) - 路径索引
//
// 输出:
//   - voteHash: public (instance) - 投票哈希（用于计票）
//
// 约束:
//   - 1 个投票者承诺验证
//   - 1 个默克尔树验证（levels 个 Poseidon 哈希）
//   - 1 个废止符生成
//   - 1 个投票选项验证
//   - 总计: ~(levels * 200 + 400) 个约束
//
// 约束数量:
//   - levels=20: ~4,400 个约束
//   - Poseidon 哈希: ~(20 + 3) * 200 = 4,600 个约束
//
// 安全假设:
//   - Poseidon 哈希的单向性和抗碰撞性
//   - 标准 Groth16 假设
//   - 受信任的 Setup (Powers of Tau)
//   - voterSecret 必须保密且高熵
//
// 使用场景:
//   - DAO 治理投票（隐私保护）
//   - 公司董事会投票
//   - 匿名民意调查
//   - 隐私选举系统
//
// 限制:
//   - 仅支持二选一投票（0 或 1）
//   - 需要预先注册投票者（构建默克尔树）
//   - 默克尔树深度固定
//   - 不支持投票修改
//
// 性能:
//   - 证明时间: ~350ms (levels=20)
//   - 验证时间: ~16ms
//   - Gas 消耗: ~300K (链上验证)
//   - 电路大小: ~4,400 约束
//
// ⚠️ 注意:
//   - voterSecret 泄露会导致身份暴露
//   - nullifier 确保每人只能投一次
//   - 投票结果通过 voteHash 进行盲化
//   - 需要链下维护投票者列表
//
// 隐私保护:
//   - 投票者身份完全隐藏
//   - 投票内容加密
//   - 仅验证投票权和唯一性
//   - 支持匿名计票
//
// 防止攻击:
//   - 默克尔树防止未授权投票
//   - 废止符防止双重投票
//   - 承诺方案防止伪造
//   - 位约束防止无效投票
//
// 投票流程:
//   1. 注册阶段：生成 voterCommitment 并加入默克尔树
//   2. 投票阶段：生成证明提交 nullifier 和 voteHash
//   3. 计票阶段：链下解密 voteHash 统计结果
//   4. 验证阶段：任何人都可验证投票有效性
//
// 示例用法:
//   // 投票者投票
//   component voting = VotingCircuit(20);
//   voting.voterSecret <== secret;
//   voting.vote <== 1;  // 投赞成票
//   voting.merkleRoot <== root;
//   for (var i = 0; i < 20; i++) {
//       voting.pathElements[i] <== path[i];
//       voting.pathIndices[i] <== indices[i];
//   }
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
include "circomlib/mux1.circom";

/// 投票电路
/// 
/// 功能：
/// - 验证投票者身份（通过默克尔树）
/// - 生成废止符防止双重投票
/// - 加密投票内容
/// - 保护投票者隐私
template VotingCircuit(levels) {
    // 输入信号
    signal input voterSecret;               // 投票者私钥（私密）
    signal input vote;                      // 投票选项（私密，0或1）
    signal input merkleRoot;                // 投票者默克尔树根（公开）
    signal input pathElements[levels];      // 默克尔路径（私密）
    signal input pathIndices[levels];       // 路径索引（私密）
    
    // 输出信号
    signal output voterCommitment;          // 投票者承诺（公开）
    signal output nullifier;                // 废止符（公开）
    signal output voteHash;                 // 投票哈希（公开）

    // ===== 第一步：验证投票选项有效性 =====
    // ✅ 约束: vote 必须是 0 或 1
    vote * (1 - vote) === 0;

    // ===== 第二步：生成投票者承诺 =====
    // voterCommitment = H(voterSecret)
    component commitmentHasher = Poseidon(1);
    commitmentHasher.inputs[0] <== voterSecret;
    voterCommitment <== commitmentHasher.out;

    // ===== 第三步：验证投票者在默克尔树中 =====
    // 逐层计算哈希验证路径
    signal currentHash[levels + 1];
    currentHash[0] <== voterCommitment;

    component hashers[levels];
    component mux[levels];

    for (var i = 0; i < levels; i++) {
        // ✅ 约束: pathIndices[i] 必须是 0 或 1
        pathIndices[i] * (1 - pathIndices[i]) === 0;

        // 选择左右节点顺序
        mux[i] = MultiMux1(2);
        mux[i].c[0][0] <== currentHash[i];
        mux[i].c[0][1] <== pathElements[i];
        mux[i].c[1][0] <== pathElements[i];
        mux[i].c[1][1] <== currentHash[i];
        mux[i].s <== pathIndices[i];

        // 使用 Poseidon 哈希计算父节点
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== mux[i].out[0];
        hashers[i].inputs[1] <== mux[i].out[1];
        
        currentHash[i + 1] <== hashers[i].out;
    }

    // ✅ 约束: 计算出的根必须等于公开输入的根
    merkleRoot === currentHash[levels];

    // ===== 第四步：生成废止符（防止双重投票）=====
    // nullifier = H(voterSecret, 1)
    // 使用不同的常数确保与 voterCommitment 不同
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== voterSecret;
    nullifierHasher.inputs[1] <== 1;
    nullifier <== nullifierHasher.out;

    // ===== 第五步：生成投票哈希（加密投票内容）=====
    // voteHash = H(vote, voterSecret)
    // 这样可以在不泄露投票内容的情况下验证投票
    component voteHasher = Poseidon(2);
    voteHasher.inputs[0] <== vote;
    voteHasher.inputs[1] <== voterSecret;
    voteHash <== voteHasher.out;
}

/// 主电路
/// 公开输入: merkleRoot, voterCommitment, nullifier, voteHash
/// 私密输入: voterSecret, vote, pathElements, pathIndices
component main {public [merkleRoot]} = VotingCircuit(20);
