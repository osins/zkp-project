# 🧪 WASM Zero-Knowledge Proof Test Suite

This directory contains the complete test suite and documentation for the Rust WASM zero-knowledge proof module.

English | [简体中文](README_CN.md)

---

## 📁 Directory Structure

```
test/
├── test-wasm.js              # ⭐ Complete test suite (15 tests)
├── test-simple.js            # 🔍 Simple debugging test
├── test-results.txt          # 📊 Latest test output results
├── README.md                 # 📖 This file - Test suite documentation
└── WASM_TEST_SUCCESS.md      # 📋 Detailed test report
```

---

## 🚀 Quick Start

### Running Tests

```bash
# Run complete test from project root
cd rust-prover
node test/test-wasm.js

# Run simple test
node test/test-simple.js
```

**Expected Output:**
```
🎉 All tests passed! WASM module is working correctly!
✅ Passed tests: 15
❌ Failed tests: 0
📈 Success rate: 100.00%
```

### Compile WASM

```bash
cd rust-prover
wasm-pack build --target nodejs
```

---

## 📊 Test Overview

### test-wasm.js - Complete Test Suite ⭐

**15 test cases covering:**

1. **Proof Generation Functionality** (6 tests)
   - ✅ Regular input value tests (5, 10, 42, 100)
   - ✅ Boundary value tests (0, 1)

2. **Proof Verification Functionality** (6 tests)
   - ✅ Verify all generated proofs

3. **Security Tests** (2 tests)
   - ✅ Tampered proof rejection test
   - ✅ Empty data rejection test

4. **Performance Test** (1 test)
   - ✅ Benchmark test (5 rounds repetition)

**Test Results:**
```
✅ Passed tests: 15
❌ Failed tests: 0
📈 Success rate: 100.00%
```

---

### test-simple.js - Simple Test 🔍

Minimal test script used for:
- Quick basic functionality verification
- Debugging issues
- Getting detailed error stack

**Example Output:**
```
Testing WASM module...

Step 1: Generate proof, input value = 5
✅ Proof generated successfully
Proof size: 1312 bytes

Step 2: Verify proof
Verification result: ✅ Valid
```

---

## 💡 Usage Examples

### Basic Usage

```javascript
const { wasm_generate_proof, wasm_verify_proof } = require('../pkg/rust_prover.js');

// Generate proof
const proof = wasm_generate_proof(42);
console.log('Proof size:', proof.length); // 1312 bytes

// Verify proof
const isValid = wasm_verify_proof(proof);
console.log('Valid:', isValid); // true
```

### Error Handling

```javascript
const { wasm_generate_proof, wasm_verify_proof } = require('../pkg/rust_prover.js');

try {
    const proof = wasm_generate_proof(100);
    
    if (wasm_verify_proof(proof)) {
        console.log('✅ Proof is valid');
    } else {
        console.log('❌ Proof is invalid');
    }
} catch (error) {
    console.error('Error:', error.message);
}
```

### Tamper Detection

```javascript
const { wasm_generate_proof, wasm_verify_proof } = require('../pkg/rust_prover.js');

// Generate valid proof
const validProof = wasm_generate_proof(42);
console.log('Valid proof:', wasm_verify_proof(validProof)); // true

// Tamper with proof
const tamperedProof = new Uint8Array(validProof);
tamperedProof[0] = tamperedProof[0] ^ 0xFF;

console.log('Tampered proof:', wasm_verify_proof(tamperedProof)); // false
```

---

## 📈 Performance Metrics

| Operation | Average Time | Data Size |
|-----------|--------------|-----------|
| Proof Generation | ~840 ms | 1312 bytes |
| Proof Verification | ~600 ms | - |
| WASM Module | - | 746 KB |

---

## 📖 Related Documentation

### WASM_TEST_SUCCESS.md
- 📊 Detailed test results
- 📈 Complete performance metrics
- 🔧 Technical implementation details

---

## 🎯 Use Cases

### 1. Development Debugging
```bash
# Quick functionality verification
node test/test-simple.js
```

### 2. Complete Testing
```bash
# Run all tests
node test/test-wasm.js
```

### 3. Performance Testing
```bash
# View performance metrics
node test/test-wasm.js | grep "Average"
```

### 4. Save Test Results
```bash
node test/test-wasm.js > test/test-results.txt 2>&1
```

---

## 🔧 Development Workflow

### 1. Modify Code
```bash
# Edit source code
vim ../src/lib.rs
vim ../src/circuit.rs
```

### 2. Recompile
```bash
cd ..
wasm-pack build --target nodejs
```

### 3. Run Tests
```bash
# Quick test
node test/test-simple.js

# Complete test
node test/test-wasm.js
```

### 4. Check Results
```bash
# View detailed results
cat test/test-results.txt
```

---

## 🆘 Troubleshooting

### Tests Failed?

```bash
# 1. Clean and recompile
cd rust-prover
cargo clean
wasm-pack build --target nodejs

# 2. Run simple test for detailed errors
node test/test-simple.js
```

### Module Not Found?

Ensure running from the correct directory:
```bash
# Correct ✅
cd rust-prover
node test/test-wasm.js

# Wrong ❌
cd rust-prover/test
node test-wasm.js  # Cannot find ../pkg/rust_prover.js
```

### Compilation Error?

```bash
# Check Rust version
rustc --version  # Need 1.70+

# Check wasm-pack
wasm-pack --version

# Reinstall dependencies
cd rust-prover
cargo update
```

---

## 📝 Adding New Tests

Add test cases in `test-wasm.js`:

```javascript
// Add in appropriate test section
try {
    console.log('\n[Test X] Your test description');
    
    // Test logic
    const proof = wasm_generate_proof(yourValue);
    
    if (/* check condition */) {
        console.log('  ✅ Test passed');
        passedTests++;
    } else {
        console.log('  ❌ Test failed');
        failedTests++;
    }
} catch (error) {
    console.log('  ❌ Exception:', error.message);
    failedTests++;
}
```

---

## ✅ Test Checklist

Before submitting code, ensure:

- [ ] `node test/test-simple.js` passes
- [ ] `node test/test-wasm.js` shows 100% pass rate
- [ ] No compilation warnings
- [ ] Performance metrics within expected range
- [ ] Documentation updated

---

## 📞 Related Resources

- **Main Project README**: `../README.md`
- **Source Code**: `../src/`
- **Compilation Output**: `../pkg/`
- **Dependencies**: `../Cargo.toml`
- **Changelog**: `../CHANGELOG.md`

---

**✨ Happy Testing!**