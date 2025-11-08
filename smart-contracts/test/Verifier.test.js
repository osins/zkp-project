const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Groth16Verifier", function () {
  let verifier;
  let zkpApp;
  let owner;
  let user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // 部署 Verifier
    const Verifier = await ethers.getContractFactory("Groth16Verifier");
    verifier = await Verifier.deploy();
    await verifier.waitForDeployment();

    // 部署 ZKPApplication
    const ZKPApp = await ethers.getContractFactory("ZKPApplication");
    zkpApp = await ZKPApp.deploy(await verifier.getAddress());
    await zkpApp.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy Verifier successfully", async function () {
      expect(await verifier.getAddress()).to.be.properAddress;
    });

    it("Should deploy ZKPApplication with correct verifier", async function () {
      expect(await zkpApp.verifier()).to.equal(await verifier.getAddress());
    });
  });

  describe("ZKPApplication", function () {
    it("Should initialize with zero points", async function () {
      expect(await zkpApp.getPoints(user.address)).to.equal(0);
    });

    it("Should not accept invalid proof", async function () {
      // 使用虚假证明数据
      const fakeA = [1, 2];
      const fakeB = [[1, 2], [3, 4]];
      const fakeC = [5, 6];
      const fakeInput = [33];

      await expect(
        zkpApp.connect(user).submitProof(fakeA, fakeB, fakeC, fakeInput)
      ).to.be.revertedWith("Invalid proof");
    });

    // 注意：要测试有效证明，需要实际生成的证明数据
    // 这需要运行 circom 电路并生成真实证明
  });

  describe("Verifier", function () {
    it("Should have verifyProof function", async function () {
      expect(verifier.verifyProof).to.be.a("function");
    });
  });
});
