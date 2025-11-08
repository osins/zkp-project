# 示例电路目录

## 📚 目录说明

此目录包含用于**学习、演示和测试**的示例电路。

## ⚠️ 重要警告

**此目录中的电路仅用于教学目的，不得直接用于生产环境！**

使用前请注意：
- ✅ 可用于学习 Circom 语法
- ✅ 可用于测试工具链
- ✅ 可用于概念验证
- ❌ 不可直接用于生产
- ❌ 不可用于处理真实资产
- ❌ 不可假设已完成安全审查

## 📋 电路清单

### ✅ 可用示例

| 电路 | 文件 | 状态 | 说明 |
|------|------|------|------|
| Multiplier | `multiplier.circom` | ✅ 可用 | 简单乘法验证，逻辑正确 |

### 🔴 已废弃（含缺陷）

| 电路 | 文件 | 状态 | 缺陷说明 |
|------|------|------|----------|
| RangeProof | `DEPRECATED_range_proof_broken.circom` | 🔴 禁用 | 硬编码输出，约束失效 |
| HashVerifier | `DEPRECATED_hash_verifier_insecure.circom` | 🔴 禁用 | 使用不安全的哈希函数 |

## 🎓 学习路径

### 1. 入门级
- **Multiplier**: 学习基本的信号和约束

### 2. 中级
- 待补充：条件逻辑、位操作
- 待补充：使用 circomlib 库

### 3. 高级
- 待补充：Poseidon 哈希
- 待补充：Merkle Tree 验证
- 待补充：ECDSA 签名验证

## 🚀 使用方式

### 构建示例电路

```bash
# 使用 multiplier 电路
cd circom-circuits
bash scripts/build_example.sh multiplier
```

### 测试示例电路

```bash
# 运行测试
npm run test:examples
```

## 📖 学习资源

- [Circom 官方文档](https://docs.circom.io/)
- [circomlib 库](https://github.com/iden3/circomlib)
- [ZK 电路设计最佳实践](../docs/BEST_PRACTICES.md)

## 🔄 从示例到生产

如需将示例电路用于生产，必须：

1. 完整的安全审查
2. 补充完整文档
3. 添加完整测试
4. 通过代码审查
5. 符合 `circuits/production/README.md` 中的所有要求

## 🐛 报告问题

发现示例电路有问题？请提交 Issue 或 PR。

---

**最后更新:** 2025-11-08
