#!/bin/bash

echo "Building Rust WASM module..."

# 安装 wasm-pack (如果未安装)
if ! command -v wasm-pack &> /dev/null; then
    echo "Installing wasm-pack..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# 构建 WASM
wasm-pack build --target nodejs --out-dir wasm/pkg --features wasm

echo "WASM build complete! Output: wasm/pkg/"
