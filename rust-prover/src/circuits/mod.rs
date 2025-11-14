// src/circuits/mod.rs - 生产级电路模块
//
// 本模块实现与 circom-circuits 对应的 Halo2 电路
//
// 包含的电路:
// 1. SquareCircuit - 平方电路 (已有)
// 2. AgeVerificationCircuit - 年龄验证电路
// 3. BalanceProofCircuit - 余额证明电路
// 4. RangeProofCircuit - 范围证明电路
// 5. MerkleProofCircuit - 默克尔树证明电路
// 6. VotingCircuit - 投票电路

pub mod age_verification;
pub mod balance_proof;
pub mod merkle_proof;
pub mod range_proof;
pub mod square;
pub mod voting;

// 重新导出常用类型
pub use age_verification::AgeVerificationCircuit;
pub use balance_proof::BalanceProofCircuit;
pub use merkle_proof::MerkleProofCircuit;
pub use range_proof::RangeProofCircuit;
pub use square::SquareCircuit;
pub use voting::VotingCircuit;
