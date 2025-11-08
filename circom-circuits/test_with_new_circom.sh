#!/bin/bash
export PATH=$HOME/.cargo/bin:$PATH
export http_proxy=http://127.0.0.1:10808
export https_proxy=http://127.0.0.1:10808
export HTTP_PROXY=http://127.0.0.1:10808
export HTTPS_PROXY=http://127.0.0.1:10808

echo "使用circom版本："
circom --version

echo "运行测试..."
npm test
EOF;