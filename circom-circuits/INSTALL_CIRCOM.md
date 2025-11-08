# Circom 安装指南

本指南详细说明如何安装 Circom 2.0+，这是运行本项目电路的必要条件。

## 📋 系统要求

- **操作系统**: macOS, Linux, Windows (WSL)
- **Rust**: 最新版本（用于编译 Circom 2.x）
- **Node.js**: >= 18.0.0（可选，用于运行测试）

## 🔧 安装方法

### 方法一：从源码编译（推荐）

这是获取最新 Circom 2.x 版本的推荐方法。

#### 步骤 1：安装 Rust

```bash
# 下载并安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 配置环境变量
source ~/.cargo/env

# 验证安装
rustc --version
```

#### 步骤 2：编译 Circom

```bash
# 克隆仓库
git clone https://github.com/iden3/circom.git
cd circom

# 检出最新版本
git checkout v2.2.3  # 或 git checkout $(git tag --sort=-version:refname | head -n 1)

# 编译
cargo build --release

# 安装到系统路径
cargo install --path circom

# 验证安装
circom --version
```

### 方法二：使用预编译二进制文件

#### macOS

```bash
# 下载最新版本
curl -fsSL https://github.com/iden3/circom/releases/latest/download/circom-macos-amd64.tar.gz -o circom-macos-amd64.tar.gz

# 解压
tar -xzf circom-macos-amd64.tar.gz

# 安装
chmod +x circom
sudo mv circom /usr/local/bin/

# 验证
circom --version
```

#### Linux

```bash
# 下载最新版本
curl -fsSL https://github.com/iden3/circom/releases/latest/download/circom-linux-amd64.tar.gz -o circom-linux-amd64.tar.gz

# 解压
tar -xzf circom-linux-amd64.tar.gz

# 安装
chmod +x circom
sudo mv circom /usr/local/bin/

# 验证
circom --version
```

#### Windows (WSL)

在 WSL 中遵循 Linux 安装步骤，或使用 Windows Subsystem for Linux (WSL)。

### 方法三：使用 Docker

```bash
# 拉取镜像
docker pull iden3/circom:latest

# 使用 Circom
docker run -it --rm -v $(pwd):/workspace iden3/circom:latest circom --version

# 编译电路
docker run -it --rm -v $(pwd):/workspace iden3/circom:latest \
  circom /workspace/circuits/production/range_proof.circom --r1cs --wasm --sym
```

### 方法四：使用 Homebrew (macOS)

```bash
# 安装
brew tap iden3/tap
brew install circom

# 验证
circom --version
```

## 🔍 验证安装

安装完成后，验证 Circom 版本：

```bash
circom --version
```

应该显示类似输出：
```
circom compiler 2.2.3
```

## ⚙️ 配置环境

### 设置 PATH

如果使用源码编译，确保 PATH 包含 cargo bin：

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
export PATH=$HOME/.cargo/bin:$PATH

# 重新加载配置
source ~/.bashrc  # 或 source ~/.zshrc
```

### 设置代理（如需要）

如果网络访问 GitHub 或 npm 有困难：

```bash
# 设置代理
export http_proxy=http://127.0.0.1:10808
export https_proxy=http://127.0.0.1:10808
export HTTP_PROXY=http://127.0.0.1:10808
export HTTPS_PROXY=http://127.0.0.1:10808

# 配置 git 代理
git config --global http.proxy http://127.0.0.1:10808
git config --global https.proxy http://127.0.0.1:10808
```

## 🧪 测试安装

编译一个简单的电路测试安装：

```bash
# 创建测试文件
cat > test.circom << 'EOF'
pragma circom 2.0.0;

template Test() {
    signal input a;
    signal input b;
    signal output c;
    
    c <== a * b;
}

component main = Test();
EOF

# 编译
circom test.circom --r1cs --wasm --sym

# 验证输出
ls -la test.r1cs test_js/test.wasm test.sym
```

## 🔧 常见问题

### Q: 为什么 npm install circom 得到的是旧版本？

A: npm 上的 circom 包已废弃，最后版本是 0.5.46。Circom 2.0+ 不再通过 npm 发布。

### Q: 如何卸载旧版本？

A: 根据安装方式：

```bash
# npm 安装
npm uninstall -g circom

# 手动安装
sudo rm -f /usr/local/bin/circom

# cargo 安装
cargo uninstall circom
```

### Q: Mac 提示"来自身份不明的开发者"怎么办？

A: 允许应用运行：

```bash
sudo xattr -r /usr/local/bin/circom
# 或在系统偏好设置 > 安全性与隐私中允许
```

### Q: 如何切换不同版本的 Circom？

A: 使用不同的可执行文件名或符号链接：

```bash
# 重命名不同版本
mv ~/.cargo/bin/circom ~/.cargo/bin/circom-2.2.3
ln -sf ~/.cargo/bin/circom-2.2.3 ~/.cargo/bin/circom
```

## 📚 更多资源

- [Circom 官方文档](https://docs.circom.io/)
- [Circom GitHub 仓库](https://github.com/iden3/circom)
- [Circom 社区讨论](https://github.com/iden3/circom/discussions)
- [零知识证明学习资源](https://zkproof.org/)

## 💡 提示

1. **保持更新**: 定期更新到最新版本以获得安全补丁
2. **使用版本控制**: 在项目中固定 Circom 版本
3. **性能优化**: 对于大型项目，考虑编译优化选项
4. **环境隔离**: 使用 Docker 或容器化确保环境一致性

---

如遇到其他问题，请查阅 [官方文档](https://docs.circom.io/getting-started/installation/) 或提交 [Issue](https://github.com/iden3/circom/issues)。