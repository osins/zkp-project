// ============================================================================
// Circuit: AgeVerification (生产级 - Circom 0.5.x 兼容版)
// ============================================================================
// 
// 用途: 隐私年龄验证（不泄露具体年龄，仅证明满足年龄要求）
// 状态: ✅ 生产级
// 
// 功能: 证明年龄在允许范围内，但不泄露具体年龄值
//
// 输入:
//   - birthYear: private (witness) - 出生年份
//   - currentYear: public (instance) - 当前年份  
//   - minAge: public (instance) - 最小年龄要求
//
// 输出:
//   - isValid: public - 是否满足年龄要求
//
// 约束:
//   - age = currentYear - birthYear
//   - age >= minAge
//   - age < 150 (合理性检查)
//
// 示例：
//   证明年满 18 岁（不泄露具体年龄）
//   birthYear = 2000 (private)
//   currentYear = 2025 (public)
//   minAge = 18 (public)
//   → age = 25, isValid = 1
//
// ============================================================================

// 简单的大于等于比较
template GreaterEqThan(n) {
    signal input in[2];
    signal output out;

    component lt = LessThan(n);
    lt.in[0] <== in[1];
    lt.in[1] <== in[0];
    
    out <== 1 - lt.out;
}

// 小于比较
template LessThan(n) {
    assert(n <= 252);
    signal input in[2];
    signal output out;

    component n2b = Num2Bits(n+1);
    n2b.in <== in[0] + (1<<n) - in[1];

    out <== 1-n2b.out[n];
}

// 位分解
template Num2Bits(n) {
    signal input in;
    signal output out[n];
    var lc1=0;

    var e2=1;
    for (var i = 0; i<n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] -1 ) === 0;
        lc1 += out[i] * e2;
        e2 = e2+e2;
    }

    lc1 === in;
}

// 主电路
template AgeVerification() {
    signal input birthYear;      // 私密
    signal input currentYear;    // 公开
    signal input minAge;         // 公开
    signal output isValid;

    // 计算年龄
    signal age;
    age <== currentYear - birthYear;

    // 检查 age >= minAge
    component ageCheck = GreaterEqThan(8);
    ageCheck.in[0] <== age;
    ageCheck.in[1] <== minAge;

    // 检查 age < 150 (合理性)
    component maxCheck = LessThan(8);
    maxCheck.in[0] <== age;
    maxCheck.in[1] <== 150;

    // 两个条件都满足
    isValid <== ageCheck.out * maxCheck.out;
}

component main = AgeVerification();
