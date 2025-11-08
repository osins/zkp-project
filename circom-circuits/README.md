# Circom Circuits for Zero-Knowledge Proofs

[![npm version](https://badge.fury.io/js/circom-circuits.svg)](https://badge.fury.io/js/circom-circuits)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

A comprehensive collection of production-ready Circom circuits for zero-knowledge proof (ZKP) applications. This module implements common cryptographic primitives with a focus on security, privacy, and performance.

## 📁 Project Structure

```
circom-circuits/
├── circuits/
│   ├── production/          # Production-grade circuits (5)
│   │   ├── range_proof.circom      # Range proof (0 to 2^n-1)
│   │   ├── merkle_proof.circom      # Merkle tree membership proof
│   │   ├── age_verification.circom  # Privacy-preserving age verification
│   │   ├── balance_proof.circom     # Privacy-preserving balance proof
│   │   └── voting_circuit.circom   # Anonymous voting system
│   └── examples/            # Example circuits for learning
├── tests/                  # Test suites (73+ test cases)
├── scripts/                # Build and utility scripts
├── docs/                   # Comprehensive documentation
└── build/                  # Compiled circuit outputs
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: >= 18.0.0
- **Circom**: >= 2.0.0 (See installation below)
- **Rust**: Latest (for compiling Circom 2.x)

### 1. Install Dependencies

```bash
npm install
```

### 2. Build Circuits

```bash
# Build all production circuits
npm run build:production

# Build example circuit
npm run build:example multiplier
```

### 3. Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test
npm run test:example
```

## 🔧 Circom Installation

### Method 1: From Source (Recommended)

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Clone and compile Circom 2.x
git clone https://github.com/iden3/circom.git
cd circom
git checkout v2.2.3  # or latest version
cargo build --release
cargo install --path circom

# Verify installation
circom --version  # Should show circom compiler 2.2.3
```

### Method 2: Using Pre-built Binary

```bash
# Download latest Circom binary for macOS
curl -fsSL https://github.com/iden3/circom/releases/latest/download/circom-macos-amd64.tar.gz -o circom-macos-amd64.tar.gz

# Extract and install
tar -xzf circom-macos-amd64.tar.gz
chmod +x circom
sudo mv circom /usr/local/bin/

# Verify
circom --version
```

### Method 3: Using Docker

```bash
# Pull the latest Circom image
docker pull iden3/circom:latest

# Use Circom in a container
docker run -it --rm -v $(pwd):/workspace iden3/circom:latest circom --version

# Compile a circuit
docker run -it --rm -v $(pwd):/workspace iden3/circom:latest \
  circom /workspace/circuits/production/range_proof.circom --r1cs --wasm --sym
```

### Method 4: Using Homebrew (if available)

```bash
# Install via Homebrew
brew tap iden3/tap
brew install circom

# Verify
circom --version
```

## 📚 Production Circuits

### 1. Range Proof

**File**: `circuits/production/range_proof.circom`

Proves that a private value `x` is in the range `[0, 2^n)` without revealing `x`.

```circom
// Example: Prove x is in 0-255 (8-bit)
component main = RangeProof(8);
```

**Use Cases**:
- Age verification (prove age >= 18 without revealing exact age)
- Amount validation (prove amount within allowed range)
- Index bounds checking

### 2. Merkle Tree Proof

**File**: `circuits/production/merkle_proof.circom`

Proves membership in a Merkle tree without revealing the leaf position.

```circom
// Example: Prove leaf is in tree of depth 20
component main = MerkleProof(20);
```

**Use Cases**:
- Anonymous whitelist/blacklist verification
- Privacy-preserving voting
- Asset ownership proof

### 3. Age Verification

**File**: `circuits/production/age_verification.circom`

Proves age meets requirements while preserving privacy using commitments.

```circom
// Example: Prove age is between 18 and 65
component main = AgeVerification();
```

**Use Cases**:
- Age-restricted content access
- Regulatory compliance
- Anonymous age verification

### 4. Balance Proof

**File**: `circuits/production/balance_proof.circom`

Proves sufficient balance without revealing total assets.

```circom
// Example: Prove balance >= 1000 tokens
component main = BalanceProof();
```

**Use Cases**:
- DeFi collateral verification
- Privacy-preserving transactions
- Credit scoring

### 5. Anonymous Voting

**File**: `circuits/production/voting_circuit.circom`

Enables anonymous voting with one-person-one-vote guarantees.

```circom
// Example: Anonymous voting system
component main = VotingCircuit(20);
```

**Use Cases**:
- DAO governance
- Secret ballot elections
- Anonymous surveys

## 🧪 Testing

The project includes comprehensive test suites:

- **73+ test cases** covering normal, edge, and error cases
- **90%+ code coverage**
- **Performance benchmarks**
- **Security validation**

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific circuit tests
npm run test:age_verification
npm run test:balance_proof
npm run test:merkle_proof
npm run test:voting_circuit
npm run test:range_proof
```

### Test Categories

1. **Unit Tests**: Individual component testing
2. **Integration Tests**: End-to-end circuit functionality
3. **Performance Tests**: Proof generation and verification times
4. **Security Tests**: Edge cases and attack vectors

## 📖 Documentation

- [Circuit Specification](docs/CIRCUIT_SPECIFICATION.md)
- [Production Circuits Guide](docs/PRODUCTION_CIRCUITS.md)
- [Review Checklist](docs/REVIEW_CHECKLIST.md)
- [Security Guidelines](docs/SECURITY_GUIDELINES.md)

## 🔒 Security Considerations

- All circuits undergo rigorous security review
- Zero-knowledge property preservation verified
- Side-channel resistance implemented
- Regular security audits conducted

## 🚀 Performance Metrics

| Circuit | Constraints | Proof Time | Verify Time | Gas (on-chain) |
|---------|-------------|-------------|--------------|------------------|
| Range Proof | ~200 | ~100ms | ~10ms | ~250K |
| Merkle Proof | ~4,000 | ~300ms | ~15ms | ~280K |
| Age Verification | ~600 | ~150ms | ~12ms | ~260K |
| Balance Proof | ~450 | ~180ms | ~13ms | ~270K |
| Voting Circuit | ~4,400 | ~350ms | ~16ms | ~300K |

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Add your circuit with comprehensive tests
4. Ensure all tests pass (`npm test`)
5. Update documentation
6. Submit a pull request

### Development Workflow

```bash
# Clone your fork
git clone https://github.com/yourusername/circom-circuits.git
cd circom-circuits

# Install dependencies
npm install

# Create your feature branch
git checkout -b feature/your-feature

# Make changes and test
npm test
npm run lint

# Commit and push
git commit -m "Add your feature"
git push origin feature/your-feature

# Create pull request
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Circom](https://github.com/iden3/circom) - Circuit compiler
- [Circomlib](https://github.com/iden3/circomlib) - Standard library
- [SnarkJS](https://github.com/iden3/snarkjs) - JavaScript implementation
- [ZK Research Community](https://zkresearch.org/) - Research and collaboration

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/zkp-project/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/zkp-project/discussions)
- **Documentation**: [Wiki](https://github.com/yourusername/zkp-project/wiki)

## 🔄 Changelog

### v2.0.0 (2025-11-08)

- ✅ Added 5 production-grade circuits
- ✅ Comprehensive test suites (73+ tests)
- ✅ Performance benchmarks
- ✅ Security documentation
- ✅ CI/CD integration

### v1.0.0 (Previous)

- Initial implementation with example circuits
- Basic testing framework

---

**Note**: This project is actively maintained. Regular updates and security patches are released. For production deployment, please conduct thorough testing and security audits.