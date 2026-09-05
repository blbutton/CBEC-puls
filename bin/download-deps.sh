#!/usr/bin/env bash
set -euo pipefail

# 颜色输出常量
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() {
    echo -e "${GREEN}[INFO] $*${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $*${NC}"
}

error() {
    echo -e "${RED}[ERROR] $*${NC}"
}

# --------------------------
info "===== 开始安装项目依赖 ====="

# 进入 mall‑swarm 后端 maven 项目
info "进入 mall‑swarm，执行 mvn install"
cd mall-swarm
mvn install

# --------------------------
info "===== 初始化 mall‑AI Python 虚拟环境 ====="
cd mall-AI

# 创建虚拟环境
info "创建虚拟环境 .mall‑AI"
python -m venv .mall-AI

# bash 下 source 激活虚拟环境
info "激活虚拟环境并安装 requirements.txt"
source .mall-AI/bin/activate

pip install -r "requirements.txt"

info "退出 mall‑AI 虚拟环境"
deactivate

cd ..

# --------------------------
info "===== 初始化 mall‑new Python 虚拟环境 ====="
cd mall-new

info "创建虚拟环境 .mall‑new"
python -m venv .mall-new

info "激活虚拟环境并安装 requirements.txt"
source .mall-new/bin/activate

pip install -r "requirements.txt"

info "退出 mall‑new 虚拟环境"
deactivate

cd ../..

# --------------------------
info "===== 初始化 wed 前端 pnpm 依赖 ====="
cd wed
info "执行 pnpm install"
pnpm i

info "===== 全部依赖安装完成 ====="