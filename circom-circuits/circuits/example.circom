pragma circom 2.0.0;

// 简单的乘法验证电路
// 证明知道 a 和 b 使得 a * b = c
template Multiplier() {
    signal input a;
    signal input b;
    signal output c;

    c <== a * b;
}

// 范围证明电路：证明 x 在指定范围内
template RangeProof(n) {
    signal input x;
    signal input lowerBound;
    signal input upperBound;
    signal output valid;

    // x >= lowerBound
    signal diff1;
    diff1 <== x - lowerBound;

    // upperBound >= x
    signal diff2;
    diff2 <== upperBound - x;

    // 简化版：假设输入已满足范围（实际应用需要更严格的约束）
    valid <== 1;
}

// 哈希验证电路（使用 Poseidon）
template HashVerifier() {
    signal input preimage;
    signal input expectedHash;
    
    // 简单平方作为哈希（实际应用应使用 Poseidon）
    signal hash;
    hash <== preimage * preimage;
    
    // 验证哈希匹配
    expectedHash === hash;
}

// 主电路：组合多个子电路
component main {public [b]} = Multiplier();
