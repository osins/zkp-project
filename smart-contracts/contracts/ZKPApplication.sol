// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Verifier 合约接口 - 需要单独声明
interface IVerifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[1] calldata _pubSignals
    ) external view returns (bool);
}

/**
 * @title ZKPApplication
 * @dev 使用零知识证明的应用示例合约
 */
contract ZKPApplication {
    IVerifier public verifier;
    
    // 记录已验证的证明
    mapping(bytes32 => bool) public verifiedProofs;
    
    // 用户积分（通过 ZKP 验证后获得）
    mapping(address => uint256) public userPoints;
    
    // 事件
    event ProofVerified(address indexed user, bytes32 proofHash, uint256 publicSignal);
    event PointsAwarded(address indexed user, uint256 points);

    constructor(address _verifierAddress) {
        verifier = IVerifier(_verifierAddress);
    }

    /**
     * @dev 提交零知识证明并获得奖励
     * @param _pA 证明参数 A
     * @param _pB 证明参数 B
     * @param _pC 证明参数 C
     * @param _pubSignals 公开信号
     */
    function submitProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[1] calldata _pubSignals
    ) external {
        // 计算证明哈希
        bytes32 proofHash = keccak256(abi.encodePacked(_pA, _pB, _pC, _pubSignals));
        
        // 检查证明是否已被使用
        require(!verifiedProofs[proofHash], "Proof already used");
        
        // 验证证明
        bool verified = verifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        require(verified, "Invalid proof");
        
        // 标记证明已验证
        verifiedProofs[proofHash] = true;
        
        // 奖励积分
        uint256 points = 100;
        userPoints[msg.sender] += points;
        
        emit ProofVerified(msg.sender, proofHash, _pubSignals[0]);
        emit PointsAwarded(msg.sender, points);
    }

    /**
     * @dev 查询用户积分
     */
    function getPoints(address user) external view returns (uint256) {
        return userPoints[user];
    }

    /**
     * @dev 检查证明是否已被验证
     */
    function isProofVerified(bytes32 proofHash) external view returns (bool) {
        return verifiedProofs[proofHash];
    }

    /**
     * @dev 更新 Verifier 合约地址（仅管理员）
     */
    function updateVerifier(address _newVerifier) external {
        // 这里应该添加访问控制
        verifier = IVerifier(_newVerifier);
    }
}
