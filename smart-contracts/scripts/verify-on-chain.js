const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔗 On-chain Proof Verification Script\n");

  // 1. 读取部署信息
  const deploymentPath = path.join(__dirname, "../deployments.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployment info not found. Run deploy script first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const zkpAppAddress = deployment.contracts.ZKPApplication;
  console.log("📍 ZKP Application:", zkpAppAddress);

  // 2. 读取证明数据
  const calldataPath = path.join(__dirname, "../../circom-circuits/build/calldata.txt");
  if (!fs.existsSync(calldataPath)) {
    console.error("❌ Calldata not found. Generate proof first.");
    process.exit(1);
  }

  const calldata = fs.readFileSync(calldataPath, "utf8");
  console.log("📂 Loaded calldata\n");

  // 3. 解析 calldata
  const argv = calldata
    .replace(/["[\]\s]/g, "")
    .split(',')
    .map(x => BigInt(x).toString());

  const a = [argv[0], argv[1]];
  const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
  const c = [argv[6], argv[7]];
  const input = [argv[8]]; // 只取第一个公开输入

  console.log("📋 Proof parameters:");
  console.log("   a:", a);
  console.log("   b:", b);
  console.log("   c:", c);
  console.log("   public input:", input);

  // 4. 连接合约
  const [signer] = await hre.ethers.getSigners();
  console.log("\n👤 Submitting from:", signer.address);

  const ZKPApp = await hre.ethers.getContractFactory("ZKPApplication");
  const zkpApp = ZKPApp.attach(zkpAppAddress);

  // 5. 提交证明
  console.log("\n📤 Submitting proof to blockchain...");
  try {
    const tx = await zkpApp.submitProof(a, b, c, input);
    console.log("⏳ Transaction sent:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

    // 6. 检查事件
    console.log("\n📡 Events emitted:");
    for (const event of receipt.logs) {
      try {
        const parsed = zkpApp.interface.parseLog(event);
        if (parsed) {
          console.log(`   ${parsed.name}:`, parsed.args);
        }
      } catch (e) {
        // Skip unparseable logs
      }
    }

    // 7. 查询用户积分
    const points = await zkpApp.getPoints(signer.address);
    console.log("\n🎯 User points:", points.toString());

    console.log("\n✅ On-chain verification successful!");

  } catch (error) {
    console.error("❌ Transaction failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
