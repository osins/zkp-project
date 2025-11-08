# 🚀 Quick Start Guide

Experience the complete ZKP workflow in 5 minutes!

English | [简体中文](QUICKSTART_CN.md)

## ⚡ One-Click Install and Run

```bash
# 1. Clone project (if needed)
# git clone <your-repo-url>
cd zkp-project

# 2. Automatically install all dependencies
bash scripts/setup.sh

# 3. Run complete demonstration
bash scripts/demo.sh
```

## 📝 Step-by-Step Guide

### Step 1: Build Circom Circuit

```bash
cd circom-circuits
npm run build
```

**Output Files:**
- ✅ `build/example.r1cs` - Circuit constraints
- ✅ `build/example_final.zkey` - Proving key
- ✅ `build/verification_key.json` - Verification key
- ✅ `build/Verifier.sol` - Solidity verifier

**Estimated Time:** 2-5 minutes (first time needs to download Powers of Tau)

---

### Step 2: Generate Zero-Knowledge Proof

```bash
cd node-sdk
npm run generate-proof
```

**Example Output:**
```
🔐 Generating zero-knowledge proof...
📥 Input: { a: 3, b: 11 }
   Expected: c = 33

✅ Proof generated successfully
📊 Public signals: [ '33' ]
💾 Proof saved to ../../circom-circuits/build/generated_proof.json
```

**Generated Files:**
- `build/generated_proof.json`
- `build/generated_calldata.txt`

---

### Step 3: Off-chain Verification

```bash
npm run verify-proof
```

**Example Output:**
```
🔍 Verifying proof off-chain...

🔑 Verification Key Info:
   Protocol: groth16
   Curve: bn128
   Public inputs: 1

✅ Proof verified successfully!

📊 Verification Result:
   Status: ✅ VALID
   Public signals: 33
```

---

### Step 4: Deploy Smart Contracts

**Start local Hardhat node (Terminal 1):**
```bash
cd smart-contracts
npx hardhat node
```

**Deploy contracts (Terminal 2):**
```bash
cd smart-contracts
npm run deploy:localhost
```

**Example Output:**
```
🚀 Deploying ZKP Contracts...

1️⃣  Deploying Groth16Verifier...
✅ Groth16Verifier deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

2️⃣  Deploying ZKPApplication...
✅ ZKPApplication deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

📊 Deployment Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Network:          localhost
Verifier:         0x5FbDB...
ZKP Application:  0xe7f17...
```

---

### Step 5: On-chain Verification

```bash
node scripts/verify-on-chain.js
```

**Example Output:**
```
🔗 On-chain Proof Verification Script

📍 ZKP Application: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

📤 Submitting proof to blockchain...
⏳ Transaction sent: 0x1234...
✅ Transaction confirmed in block: 2

📡 Events emitted:
   ProofVerified: [ '0x742d...', '0xabcd...', 33n ]
   PointsAwarded: [ '0x742d...', 100n ]

🎯 User points: 100

✅ On-chain verification successful!
```

---

## 🎯 Complete Workflow Summary

| Step | Command | Output | Time |
|------|---------|---------|------|
| 1. Build Circuit | `npm run build` | zkey, vkey, Verifier.sol | 2-5 min |
| 2. Generate Proof | `npm run generate-proof` | proof.json | 5-10 sec |
| 3. Off-chain Verify | `npm run verify-proof` | ✅/❌ | <1 sec |
| 4. Deploy Contracts | `npm run deploy:localhost` | Contract address | 5-10 sec |
| 5. On-chain Verify | `node verify-on-chain.js` | Transaction receipt | 2-5 sec |

---

## 🧪 Test Commands

```bash
# Test Rust WASM prover
cd rust-prover
node test/test-wasm.js      # Complete test (15 tests)
node test/test-simple.js    # Quick test

# Test Circom circuit
cd circom-circuits && npm run test

# Test smart contracts
cd smart-contracts && npx hardhat test

# Run all tests
npm run test:all
```

---

## 🔧 Troubleshooting

### ❌ "Circuit files not found"
**Solution:**
```bash
cd circom-circuits
npm run build
```

### ❌ "Verifier contract not deployed"
**Solution:**
1. Ensure Hardhat node is running
2. Redeploy contracts:
```bash
cd smart-contracts
npm run deploy:localhost
```

### ❌ "Powers of Tau download failed"
**Solution:**
Manual download:
```bash
cd circom-circuits/build
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau
```

### ❌ Rust compilation error
**Solution:**
```bash
# Ensure wasm-pack is installed
cargo install wasm-pack

# Clean and rebuild
cd rust-prover
cargo clean
wasm-pack build --target web
```

---

## 📚 Advanced Usage

### Custom Circuit Input

Edit `node-sdk/scripts/generateProof.ts`:

```typescript
const input = {
    a: 7,    // Modify here
    b: 9     // Modify here
};
// Expected output: c = 63
```

### Deploy to Testnet

1. Edit `smart-contracts/.env`:
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=0x...
```

2. Deploy:
```bash
npm run deploy:sepolia
```

### Start Backend API

```bash
cd backend
npm run dev

# API endpoints:
# POST http://localhost:3000/api/proof/generate
# POST http://localhost:3000/api/proof/verify
```

**Example API Call:**
```bash
curl -X POST http://localhost:3000/api/proof/generate \
  -H "Content-Type: application/json" \
  -d '{"input": {"a": 3, "b": 11}}'
```

### Test Rust WASM

```bash
cd rust-prover
wasm-pack build --target web
node test/test-wasm.js
```

---

## 🎓 Learning Path

1. **Beginners**: Run `bash scripts/demo.sh` to understand the complete workflow
2. **Intermediate**: Modify `example.circom` to implement custom logic
3. **Advanced**: Integrate Halo2 Rust prover, optimize performance

---

## 📖 Related Documentation

- [Full Documentation](README.md)
- [Project Structure](STRUCTURE.md)
- [Circom Official Docs](https://docs.circom.io/)
- [snarkjs Guide](https://github.com/iden3/snarkjs)
- [Halo2 Tutorial](https://zcash.github.io/halo2/)

---

## 🆘 Getting Help

- GitHub Issues: [Submit Issue](#)
- Discord: [Join Community](#)
- Email: support@zkp-project.io

---

**Happy ZK proving! 🎉**