/**
 * WASM 模块测试脚本
 * 测试 Halo2 零知识证明的生成和验证功能
 */

const { wasm_generate_proof, wasm_verify_proof } = require('../pkg/rust_prover.js');

console.log('🚀 开始测试 WASM 零知识证明模块...\n');

// 测试用例
const testCases = [
  { input: 5, description: '测试输入 5' },
  { input: 10, description: '测试输入 10' },
  { input: 42, description: '测试输入 42' },
  { input: 100, description: '测试输入 100' },
  { input: 0, description: '测试边界值 0' },
  { input: 1, description: '测试边界值 1' },
];

let passedTests = 0;
let failedTests = 0;

console.log('=' .repeat(60));
console.log('测试 1: 证明生成功能');
console.log('=' .repeat(60));

testCases.forEach((testCase, index) => {
  try {
    console.log(`\n[测试 ${index + 1}] ${testCase.description}`);
    console.log(`  输入值: ${testCase.input}`);
    
    const startTime = Date.now();
    const proof = wasm_generate_proof(testCase.input);
    const endTime = Date.now();
    
    if (proof && proof.length > 0) {
      console.log(`  ✅ 证明生成成功`);
      console.log(`  📦 证明大小: ${proof.length} 字节`);
      console.log(`  ⏱️  生成耗时: ${endTime - startTime} ms`);
      console.log(`  🔍 前 32 字节: ${Buffer.from(proof.slice(0, 32)).toString('hex')}`);
      passedTests++;
    } else {
      console.log(`  ❌ 证明生成失败: 返回空数据`);
      failedTests++;
    }
  } catch (error) {
    console.log(`  ❌ 证明生成异常: ${error.message}`);
    failedTests++;
  }
});

console.log('\n' + '='.repeat(60));
console.log('测试 2: 证明验证功能');
console.log('=' .repeat(60));

testCases.forEach((testCase, index) => {
  try {
    console.log(`\n[测试 ${index + 1}] ${testCase.description} - 验证环节`);
    
    // 生成证明
    const proof = wasm_generate_proof(testCase.input);
    
    // 验证证明
    const startTime = Date.now();
    const isValid = wasm_verify_proof(proof);
    const endTime = Date.now();
    
    if (isValid === true) {
      console.log(`  ✅ 证明验证通过`);
      console.log(`  ⏱️  验证耗时: ${endTime - startTime} ms`);
      passedTests++;
    } else {
      console.log(`  ❌ 证明验证失败: 有效证明被拒绝`);
      failedTests++;
    }
  } catch (error) {
    console.log(`  ❌ 证明验证异常: ${error.message}`);
    failedTests++;
  }
});

console.log('\n' + '='.repeat(60));
console.log('测试 3: 无效证明拒绝测试');
console.log('=' .repeat(60));

try {
  console.log('\n[测试] 篡改的证明数据');
  
  // 生成一个有效的证明
  const validProof = wasm_generate_proof(42);
  
  // 创建一个篡改的证明（修改前几个字节）
  const tamperedProof = new Uint8Array(validProof);
  tamperedProof[0] = tamperedProof[0] ^ 0xFF; // 翻转第一个字节
  tamperedProof[1] = tamperedProof[1] ^ 0xFF; // 翻转第二个字节
  
  const isValid = wasm_verify_proof(tamperedProof);
  
  if (isValid === false) {
    console.log(`  ✅ 无效证明被正确拒绝`);
    passedTests++;
  } else {
    console.log(`  ❌ 安全性问题: 篡改的证明被接受`);
    failedTests++;
  }
} catch (error) {
  // 如果抛出异常也算通过，因为拒绝了无效证明
  console.log(`  ✅ 无效证明被拒绝（抛出异常）`);
  passedTests++;
}

console.log('\n' + '='.repeat(60));
console.log('测试 4: 空数据测试');
console.log('=' .repeat(60));

try {
  console.log('\n[测试] 空证明数据');
  const emptyProof = new Uint8Array(0);
  const isValid = wasm_verify_proof(emptyProof);
  
  if (isValid === false) {
    console.log(`  ✅ 空证明被正确拒绝`);
    passedTests++;
  } else {
    console.log(`  ❌ 安全性问题: 空证明被接受`);
    failedTests++;
  }
} catch (error) {
  console.log(`  ✅ 空证明被拒绝（抛出异常）`);
  passedTests++;
}

console.log('\n' + '='.repeat(60));
console.log('测试 5: 性能基准测试');
console.log('=' .repeat(60));

try {
  const benchmarkRounds = 5;
  const benchmarkInput = 42;
  let totalProofTime = 0;
  let totalVerifyTime = 0;
  
  console.log(`\n[基准测试] 运行 ${benchmarkRounds} 轮证明生成和验证`);
  
  for (let i = 0; i < benchmarkRounds; i++) {
    // 证明生成
    const proofStart = Date.now();
    const proof = wasm_generate_proof(benchmarkInput);
    const proofEnd = Date.now();
    totalProofTime += (proofEnd - proofStart);
    
    // 证明验证
    const verifyStart = Date.now();
    wasm_verify_proof(proof);
    const verifyEnd = Date.now();
    totalVerifyTime += (verifyEnd - verifyStart);
  }
  
  console.log(`  📊 平均证明生成时间: ${(totalProofTime / benchmarkRounds).toFixed(2)} ms`);
  console.log(`  📊 平均证明验证时间: ${(totalVerifyTime / benchmarkRounds).toFixed(2)} ms`);
  console.log(`  ✅ 性能测试完成`);
  passedTests++;
} catch (error) {
  console.log(`  ❌ 性能测试失败: ${error.message}`);
  failedTests++;
}

// 最终测试报告
console.log('\n' + '='.repeat(60));
console.log('📋 测试总结');
console.log('=' .repeat(60));
console.log(`✅ 通过测试: ${passedTests}`);
console.log(`❌ 失败测试: ${failedTests}`);
console.log(`📈 成功率: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(2)}%`);
console.log('=' .repeat(60));

if (failedTests === 0) {
  console.log('\n🎉 所有测试通过！WASM 模块工作正常！\n');
  process.exit(0);
} else {
  console.log('\n⚠️  部分测试失败，请检查日志。\n');
  process.exit(1);
}
