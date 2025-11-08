# 🦀 Rust WASM Zero-Knowledge Proof Module

Zero-knowledge proof library based on Halo2, compiled to WebAssembly for use in Node.js and browsers.

[![Tests](https://img.shields.io/badge/tests-15%2F15%20passed-brightgreen)]()
[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![WASM](https://img.shields.io/badge/wasm-ready-blue)]()

English | [简体中文](README_CN.md)

---

## 📁 Project Structure

```
rust-prover/
├── src/                    # 📝 Source code
│   ├── lib.rs             #    WASM interface and core logic
│   └── circuit.rs         #    Halo2 circuit definition
│
├── test/                   # 🧪 Test suite
│   ├── test-wasm.js       #    Complete test (15 tests)
│   ├── test-simple.js     #    Simple test
│   ├── test-results.txt   #    Test results
│   ├── README.md          #    Test documentation (includes quick start)
│   └── WASM_TEST_SUCCESS.md   # Test report
│
├── pkg/                    # 📦 WASM compilation output
│   ├── rust_prover.js     #    JavaScript interface
│   ├── rust_prover_bg.wasm    # WASM binary (746 KB)
│   └── rust_prover.d.ts   #    TypeScript type definitions
│
├── Cargo.toml              # 🔧 Rust dependencies configuration
└── build_wasm.sh           # 🔨 Build script
```

---

## 🚀 Quick Start

### 1. Compile WASM Module

```bash
cd rust-prover
wasm-pack build --target nodejs
```

### 2. Run Tests

```bash
# Complete test suite
node test/test-wasm.js

# Quick test
node test/test-simple.js
```

### 3. Use Module

```javascript
const { wasm_generate_proof, wasm_verify_proof } = require('./pkg/rust_prover.js');

// Generate zero-knowledge proof
const proof = wasm_generate_proof(42);
console.log('Proof size:', proof.length); // 1312 bytes

// Verify proof
const isValid = wasm_verify_proof(proof);
console.log('Verification result:', isValid); // true
```

---

## ✨ Features

- ✅ **Zero-knowledge**: Prove knowledge without revealing information
- ✅ **High performance**: Generation ~840ms, verification ~600ms
- ✅ **Cross-platform**: Supports Node.js and browsers
- ✅ **Type-safe**: Provides TypeScript type definitions
- ✅ **Complete testing**: 15 test cases, 100% pass rate

---

## 🔧 Technology Stack

| Component | Technology |
|-----------|-------------|
| ZKP Library | Halo2 Proofs v0.3.1 |
| Elliptic Curve | Pallas (pasta_curves) |
| Hash Function | Blake2b |
| WASM Binding | wasm-bindgen |
| Circuit | SquareCircuit (y = x²) |

---

## 📊 Performance Metrics

| Operation | Time | Size |
|-----------|------|------|
| Proof Generation | ~840 ms | 1312 bytes |
| Proof Verification | ~600 ms | - |
| WASM Module | - | 746 KB |

---

## 📖 Documentation

- **[Test Documentation](test/README.md)** - Test suite explanation and quick start
- **[Test Report](test/WASM_TEST_SUCCESS.md)** - Complete test results

---

## 🧪 Testing

### Running Tests

```bash
# Complete test (recommended)
node test/test-wasm.js

# Quick test
node test/test-simple.js

# Save test results
node test/test-wasm.js > test/test-results.txt 2>&1
```

### Test Coverage

- ✅ Proof generation (6 tests)
- ✅ Proof verification (6 tests)
- ✅ Security tests (2 tests)
- ✅ Performance tests (1 test)

**Result**: 15/15 passed ✅

---

## 🔨 Development

### Installing Dependencies

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install wasm-pack
cargo install wasm-pack
```

### Building

```bash
# Development build
wasm-pack build --dev --target nodejs

# Production build
wasm-pack build --target nodejs

# Browser build
wasm-pack build --target web
```

### Development Workflow

```bash
# 1. Modify code
vim src/lib.rs

# 2. Recompile
wasm-pack build --target nodejs

# 3. Run tests
node test/test-wasm.js
```

---

## 💡 Usage Examples

### Node.js

```javascript
const { wasm_generate_proof, wasm_verify_proof } = require('./pkg/rust_prover.js');

try {
    // Generate proof
    const secretValue = 100;
    const proof = wasm_generate_proof(secretValue);
    
    console.log('✅ Proof generated successfully');
    console.log('Proof size:', proof.length, 'bytes');
    
    // Verify proof
    const isValid = wasm_verify_proof(proof);
    console.log('Verification result:', isValid ? '✅ Valid' : '❌ Invalid');
    
} catch (error) {
    console.error('Error:', error.message);
}
```

### Browser

```html
<!DOCTYPE html>
<html>
<head>
    <title>ZKP Demo</title>
</head>
<body>
    <script type="module">
        import init, { wasm_generate_proof, wasm_verify_proof } 
            from './pkg/rust_prover.js';
        
        async function demo() {
            await init();
            
            const proof = wasm_generate_proof(42);
            const isValid = wasm_verify_proof(proof);
            
            console.log('Valid:', isValid);
        }
        
        demo();
    </script>
</body>
</html>
```

---

## 🔐 Security

### Verified Security Features

- ✅ **Tamper-proof**: Modified proofs will fail verification
- ✅ **Input validation**: Rejects empty data and invalid inputs
- ✅ **Zero-knowledge**: Does not leak original input values
- ✅ **Verifiable**: Anyone can verify the proof

### Security Test Results

```
✅ Tamper detection: Passed
✅ Empty data rejection: Passed
✅ Verification consistency: Passed
```

---

## 📦 Dependencies

### Rust Crates

```toml
[dependencies]
halo2_proofs = "0.3.1"
halo2curves = "0.9.0"
wasm-bindgen = "0.2"
rand = "0.8"
getrandom = { version = "0.2", features = ["js"] }
console_error_panic_hook = "0.1"
```

### System Requirements

- **Rust**: 1.70+
- **wasm-pack**: Latest version
- **Node.js**: 14+ (for testing)

---

## 🐛 Troubleshooting

### Compilation failed?

```bash
# Clean and rebuild
cargo clean
wasm-pack build --target nodejs
```

### Tests failed?

```bash
# Run simple test for detailed errors
node test/test-simple.js
```

### Module not found?

```bash
# Ensure running from correct directory
cd rust-prover
node test/test-wasm.js
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Pre-commit Checks

- [ ] Code passes `cargo fmt` formatting
- [ ] Passes `cargo clippy` checks
- [ ] All tests pass (`node test/test-wasm.js`)
- [ ] Documentation updated

---

## 📄 License

See the LICENSE file in the project root directory.

---

## 🎉 Acknowledgments

- [Halo2](https://github.com/zcash/halo2) - Zero-knowledge proof library
- [wasm-bindgen](https://github.com/rustwasm/wasm-bindgen) - Rust WASM bindings
- [pasta_curves](https://github.com/zcash/pasta_curves) - Pallas/Vesta curves

---

## 📞 Support

Having issues?

1. Check [Test Documentation](test/README.md)
2. Check [Quick Start](test/QUICK_START.md)
3. Run `node test/test-simple.js` for detailed errors

---

**✨ Start using zero-knowledge proofs now!**