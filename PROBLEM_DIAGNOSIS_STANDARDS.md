# 🎯 问题诊断标准（Problem Diagnosis Standards）

**文档类型：** 团队规范  
**适用范围：** 所有开发人员和 AI 助手  
**创建日期：** 2025-11-08  
**触发案例：** Halo2 测试跳过问题（WASM 未构建被误诊为兼容性问题）

---

## 📖 目录

1. [核心原则](#核心原则)
2. [问题诊断 5 步法](#问题诊断-5-步法)
3. [常见错误模式](#常见错误模式)
4. [实战案例](#实战案例)
5. [检查清单](#检查清单)
6. [标准报告模板](#标准报告模板)

---

## 核心原则

### 奥卡姆剃刀原则
> **"如无必要，勿增实体"**  
> **"最简单的解释往往是正确的"**

### 三个优先
1. **简单优于复杂**：一行命令 > 三个方案
2. **实测优于臆测**：运行一次 > 分析十次
3. **基础优于高级**：检查文件存在 > 分析依赖冲突

### 一句话精髓
> **"先检查文件是否存在，再谈架构设计。"**

---

## 问题诊断 5 步法

### 步骤 1：基础环境检查（First Things First）

**必须按顺序检查：**

```bash
# 1. 文件/目录是否存在？
ls -la [目标路径]
# 例：ls -la rust-prover/pkg/

# 2. 依赖是否安装？
npm list [包名]
pip list | grep [包名]
cargo tree | grep [包名]

# 3. 版本是否正确？
node --version
python --version
rustc --version

# 4. 权限是否足够？
ls -l [文件]
whoami

# 5. 路径是否正确？
pwd
echo $PATH
which [命令]
```

**⚠️ 禁止跳过此步骤！即使看起来"很明显"！**

**真实案例：**
```bash
# ❌ 错误：直接分析复杂原因
"可能是 halo2curves 依赖冲突..."
"可能是 ESM/CommonJS 兼容性问题..."

# ✅ 正确：先检查基础
$ ls rust-prover/pkg/
ls: rust-prover/pkg/: No such file or directory

# 结论：文件不存在，需要构建！
```

---

### 步骤 2：尝试最简单的解决方案（Simplest First）

**优先级顺序：**

1. **直接运行/构建**（看是否有真实错误）
   ```bash
   npm install
   npm run build
   cargo build
   pytest
   ```

2. **清理缓存后重试**
   ```bash
   rm -rf node_modules && npm install
   cargo clean && cargo build
   rm -rf __pycache__ && pytest
   ```

3. **查看最新日志/输出**（不依赖旧日志）
   ```bash
   npm test 2>&1 | tee output.log
   cargo build 2>&1 | tee build.log
   ```

4. **运行相关测试**（获取实际错误信息）
   ```bash
   npm test -- --verbose
   cargo test -- --nocapture
   pytest -v
   ```

**禁止行为：**
- ❌ 先分析复杂原因
- ❌ 先查看历史日志/文档
- ❌ 先猜测依赖冲突/版本问题
- ❌ 先提出多个复杂方案

**真实案例：**
```bash
# ❌ 错误：提供 3 个复杂方案
方案 A：修改 Cargo.toml，升级 halo2_proofs...
方案 B：降级到已知版本...
方案 C：重构代码适配新 API...

# ✅ 正确：先尝试最简单的
$ cd rust-prover
$ wasm-pack build --target nodejs --release
[INFO]: ✨   Done in 0.30s
# 成功！问题解决！
```

---

### 步骤 3：重现问题（Reproduce First）

**必须实际执行：**

```bash
# 1. 运行失败的命令/测试
npm test
cargo build
python script.py

# 2. 记录完整的实际输出（不是日志文件中的旧输出）
npm test 2>&1 | tee test-output-$(date +%Y%m%d-%H%M%S).log

# 3. 确认问题仍然存在（不是历史问题）
# 重复运行 2-3 次，确认错误一致
```

**关键问题：**
- ❓ 问题能重现吗？
- ❓ 错误信息是最新的吗？
- ❓ 错误与描述一致吗？

**如果不能重现 → 问题可能已解决或描述不准确**

**真实案例：**
```bash
# ❌ 错误：依赖旧日志
"根据 logs/build_rust_wasm.log.stderr，
存在 halo2curves feature 错误..."

# ✅ 正确：重新运行获取最新输出
$ cd rust-prover
$ wasm-pack build --target nodejs --release
[INFO]: ✨   Done in 0.30s  # 实际上没有错误！

# 结论：旧日志已过时，问题不存在！
```

---

### 步骤 4：基于实际错误分析（Evidence-Based）

**只有在完成步骤 1-3 后才能分析！**

**分析依据（按优先级）：**

1. **实际运行的错误输出**（最高优先级）
   ```
   ✅ 刚才运行命令的实际输出
   ❌ 日志文件中的历史输出
   ```

2. **实际检查的文件状态**
   ```
   ✅ ls -la 的实际结果
   ❌ 文档中说的"应该存在"
   ```

3. **实际测试的结果**
   ```
   ✅ npm test 的实际输出
   ❌ 代码注释中的"测试失败"
   ```

4. **官方文档**（需验证版本匹配）
   ```
   ✅ 当前版本的官方文档
   ❌ 网上搜到的旧文档
   ```

**禁止依据：**
- ❌ 旧的日志文件
- ❌ 代码注释中的说明
- ❌ 自己的猜测
- ❌ "理论上应该"

**真实案例：**
```bash
# ❌ 错误：基于猜测分析
"WASM 使用 ESM 格式，Node.js 使用 CommonJS，
因此存在兼容性问题..."

# ✅ 正确：基于实际验证
$ head -10 rust-prover/pkg/zkp_rust_prover.js
let imports = {};
imports['__wbindgen_placeholder__'] = module.exports;
# ↑ 实际使用 CommonJS！不存在兼容性问题！

# 结论：猜测错误，实际验证才能发现真相！
```

---

### 步骤 5：提供最简单的解决方案（Occam's Razor）

**方案优先级：**

```
1️⃣ 一行命令解决
   例：npm install, cargo build, wasm-pack build

2️⃣ 修改一个配置文件
   例：package.json, Cargo.toml, .gitignore

3️⃣ 修改少量代码（< 10 行）
   例：修复一个函数、添加一个参数

4️⃣ 重构/升级依赖（最后考虑）
   例：升级 halo2_proofs, 重构架构
```

**真实案例：**
```bash
# ❌ 错误：提供复杂方案
方案 A：修改 Cargo.toml，添加 halo2curves 依赖...（20 分钟）
方案 B：升级 Halo2 到最新版本...（1-2 小时）
方案 C：降级到已知可用版本...（30-60 分钟）

# ✅ 正确：先尝试最简单的
$ wasm-pack build --target nodejs --release  # 1 分钟解决！
```

---

## 常见错误模式

### 错误模式 1：过早复杂化

**症状：**
- 看到问题 → 立即猜测复杂原因
- 跳过基础检查 → 直接分析高级问题

**示例：**
```
❌ 看到测试跳过 → 猜测"依赖冲突"、"版本不兼容"
✅ 看到测试跳过 → 先检查文件是否存在 → 尝试构建
```

**真实案例：**
```
问题：Halo2 测试被跳过
❌ 错误分析：halo2curves 依赖冲突、ESM/CommonJS 兼容性问题
✅ 实际原因：pkg/ 目录不存在，WASM 从未构建过
✅ 解决方案：wasm-pack build（1 行命令，1 分钟解决）
```

---

### 错误模式 2：依赖历史信息

**症状：**
- 相信代码注释 → 不验证是否仍然准确
- 相信旧日志 → 不重新运行获取最新输出

**示例：**
```
❌ 看到旧日志有错误 → 认为问题仍然存在
✅ 重新运行命令 → 获取最新错误 → 确认问题
```

**真实案例：**
```
旧日志：error: halo2curves feature 'bn256' not found
代码注释：// WASM 兼容性待修复，暂时禁用

❌ 错误做法：相信旧日志和注释，分析依赖问题
✅ 正确做法：重新构建，发现没有任何错误

结论：旧日志已过时，注释不准确
```

---

### 错误模式 3：臆测技术原因

**症状：**
- 使用"可能是"、"应该是"、"理论上"
- 未验证假设就提供解决方案

**示例：**
```
❌ 看到 WASM 报错 → 猜测"ESM/CommonJS 兼容性问题"
✅ 检查 pkg/ 是否存在 → 发现根本没构建 → 直接构建
```

**真实案例：**
```
❌ 臆测：
"WASM 使用 export（ESM），Node.js 使用 require（CommonJS），
因此存在兼容性问题，需要修改构建目标..."

✅ 实测：
$ head -5 pkg/zkp_rust_prover.js
let imports = {};
imports['__wbindgen_placeholder__'] = module.exports;

结论：实际使用 CommonJS，不存在兼容性问题
```

---

### 错误模式 4：提供多个复杂方案

**症状：**
- 未尝试最简单的解决方案
- 一次性提供 3+ 个复杂方案

**示例：**
```
❌ 提供 3 个方案：升级依赖、降级依赖、重构代码
✅ 先尝试最简单的：构建 WASM → 如果失败再分析
```

**真实案例：**
```
❌ 复杂方案：
方案 A：修改 Cargo.toml + 重新构建（20-30分钟）
方案 B：升级 Halo2 到最新版本（1-2小时）
方案 C：降级到已知可用版本（30-60分钟）

✅ 简单方案：
$ wasm-pack build --target nodejs --release  # 1 分钟
$ npm test  # 5 分钟
# 24/24 测试通过 ✅

总耗时：6 分钟 vs 20-120 分钟
```

---

## 实战案例

### 案例：Halo2 测试跳过问题

#### 背景
```typescript
// node-sdk/src/__tests__/dual-engine.test.ts
// Halo2 测试（WASM 兼容性待修复，暂时禁用）
describe.skip('Halo2 引擎 - Square 电路', () => {
    // ... 4 个测试用例全部被跳过
});
```

#### ❌ 错误诊断流程（违反规范）

```
1. 看到 describe.skip 和注释 "WASM 兼容性待修复"
   ↓
2. 查看旧日志：logs/build_rust_wasm.log.stderr
   error: halo2curves feature 'bn256' not found
   ↓
3. 猜测原因（未验证）：
   - halo2curves 依赖冲突
   - ESM/CommonJS 兼容性问题
   - 需要修改 Cargo.toml
   ↓
4. 提供 3 个复杂方案：
   方案 A：修改依赖（20-30分钟）
   方案 B：升级 Halo2（1-2小时）
   方案 C：降级版本（30-60分钟）
   ↓
5. 未实际运行测试
   ↓
6. 用户质疑："你执行测试了吗？"
   ↓
7. 重新来过 ❌
```

**时间成本：** 分析 20 分钟 + 返工 30 分钟 = **50 分钟浪费**

#### ✅ 正确诊断流程（符合规范）

```
1. 看到 describe.skip
   ↓
2. 步骤 1：基础检查
   $ ls -la rust-prover/pkg/
   ls: rust-prover/pkg/: No such file or directory
   ✅ 发现：pkg/ 目录不存在
   ↓
3. 步骤 2：尝试最简单解决方案
   $ cd rust-prover
   $ wasm-pack build --target nodejs --release
   [INFO]: ✨   Done in 0.30s
   ✅ 成功：WASM 构建成功
   ↓
4. 步骤 2：验证产物格式
   $ head -5 pkg/zkp_rust_prover.js
   let imports = {};
   imports['__wbindgen_placeholder__'] = module.exports;
   ✅ 确认：使用 CommonJS，兼容 Node.js
   ↓
5. 步骤 3：移除 .skip，运行测试
   $ cd ../node-sdk
   $ npm test
   Test Suites: 2 passed, 2 total
   Tests:       24 passed, 24 total
   ✅ 成功：所有测试通过
   ↓
6. 步骤 4：分析根本原因
   实际原因：WASM 从未构建过（pkg/ 不存在）
   错误假设：依赖冲突、兼容性问题（都是臆测）
   ↓
7. 步骤 5：提供最简单方案
   解决方案：wasm-pack build（1 行命令）
   ✅ 完成
```

**时间成本：** 检查 1 分钟 + 构建 1 分钟 + 测试 5 分钟 = **7 分钟解决**

#### 对比总结

| 维度 | 错误做法 | 正确做法 |
|------|----------|----------|
| **基础检查** | ❌ 跳过 | ✅ 检查 pkg/ 存在性 |
| **分析依据** | ❌ 旧日志 + 注释 | ✅ 实际运行结果 |
| **假设验证** | ❌ 未验证 | ✅ 每步验证 |
| **方案复杂度** | ❌ 3 个复杂方案 | ✅ 1 行命令 |
| **时间成本** | ❌ 50 分钟 | ✅ 7 分钟 |
| **成功率** | ❌ 返工 | ✅ 一次成功 |

#### 教训

> **"最简单的解释往往是正确的"**  
> **"先检查文件是否存在，再谈依赖冲突"**  
> **"实测一次胜过分析十次"**

---

## 检查清单

### 问题诊断前（必须确认）

```
☐ 我是否检查了文件/目录是否存在？
  ├─ 是 → 继续
  └─ 否 → 立即检查（ls -la [路径]）

☐ 我是否尝试了最简单的解决方案？
  ├─ 是 → 继续
  └─ 否 → 立即尝试（直接运行/构建）

☐ 我是否重现了问题？
  ├─ 是 → 继续
  └─ 否 → 立即重现（运行命令/测试）

☐ 我的分析是否基于实际错误输出？
  ├─ 是 → 继续
  └─ 否 → 停止！重新执行步骤 1-3

☐ 我是否使用了"可能"、"应该"、"理论上"？
  ├─ 否 → 通过
  └─ 是 → 违规！必须实测

☐ 我是否提供了最简单的解决方案？
  ├─ 是 → 通过
  └─ 否 → 简化方案
```

### 代码审查时（检查他人代码）

```
☐ 问题分析是否基于实际运行结果？
☐ 是否跳过了基础环境检查？
☐ 是否存在未验证的假设？
☐ 是否提供了不必要的复杂方案？
☐ 是否使用了不确定的词汇？
```

---

## 标准报告模板

### 问题诊断报告模板

```markdown
## 🔍 问题诊断报告（实测）

### 1. 基础环境检查

**文件存在性：**
- [x] ✅ [路径] 存在
- [ ] ❌ [路径] 不存在

**依赖完整性：**
- [x] ✅ [依赖名] 已安装（版本：[版本号]）
- [ ] ❌ [依赖名] 缺失

**版本正确性：**
- [x] ✅ Node.js [版本号]
- [x] ✅ Rust [版本号]
- [x] ✅ Python [版本号]

### 2. 重现步骤

```bash
[实际执行的命令]
```

**实际输出：**
```
[完整的实际输出，不是日志文件]
```

### 3. 实际错误分析

**错误类型：** [文件缺失 / 依赖缺失 / 版本不兼容 / 配置错误 / 其他]

**根本原因：** [基于步骤 2 的实际错误分析]

**排除的假设：**
- ❌ [假设 1]：[为什么排除]
- ❌ [假设 2]：[为什么排除]

### 4. 解决方案（最简单优先）

```bash
[一行或几行命令]
```

**预期结果：** [描述执行后的预期状态]

### 5. 验证结果

```bash
[实际执行的验证命令]
```

**实际输出：**
```
[验证命令的实际输出]
```

**结论：** ✅ 问题已解决 / ❌ 需要进一步调查

---

**诊断时间：** [X 分钟]  
**诊断人员：** [姓名 / AI]  
**诊断日期：** [YYYY-MM-DD]
```

---

## 自动化检查

### Git Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# 检查是否存在未验证的假设（不确定词汇）
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(md|ts|js|py|rs)$')

for file in $FILES; do
    if grep -q -E "(可能是|应该是|理论上|might be|should be|probably)" "$file"; then
        echo "❌ 警告：文件 $file 包含不确定词汇，请验证后再提交"
        echo "   禁止词汇：可能是、应该是、理论上、might be、should be、probably"
        exit 1
    fi
done

echo "✅ 检查通过：无不确定词汇"
```

### CI/CD 检查

```yaml
# .github/workflows/check-diagnostics.yml
name: Check Problem Diagnosis Standards

on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Check for uncertain terms
        run: |
          if grep -r -E "(可能是|应该是|理论上|might be|should be|probably)" \
             --include="*.md" --include="*.ts" --include="*.js" .; then
            echo "❌ 发现不确定词汇，请验证后再提交"
            exit 1
          fi
          echo "✅ 检查通过"
```

---

## 总结

### 核心原则（重复强调）

1. **奥卡姆剃刀：** 如无必要，勿增实体
2. **简单优于复杂：** 一行命令 > 三个方案
3. **实测优于臆测：** 运行一次 > 分析十次
4. **基础优于高级：** 检查文件存在 > 分析依赖冲突

### 一句话精髓

> **"先检查文件是否存在，再谈架构设计。"**

### 强制执行

- ✅ 每次问题诊断必须遵守 5 步法
- ✅ 每次报告必须包含基础检查结果
- ✅ 每次分析必须基于实际错误输出
- ✅ 每次方案必须先尝试最简单的

### 违规后果

- ❌ 立即停止当前分析
- ❌ 重新执行 5 步法
- ❌ 代码审查不通过

---

**文档版本：** 1.0.0  
**创建日期：** 2025-11-08  
**最后更新：** 2025-11-08  
**维护者：** 开发团队  
**强制执行：** ✅
