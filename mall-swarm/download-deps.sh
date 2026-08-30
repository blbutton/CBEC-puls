#!/usr/bin/env bash
# ============================================================================
# CBEC-puls 一键下载依赖脚本
#   - Maven 后端多模块依赖下载与安装 (mall-common / mall-mbg + 全量编译)
#   - Python mall-AI 模块依赖下载
#
# 用法:
#   chmod +x download-deps.sh
#   ./download-deps.sh            # 下载全部 (Maven + Python)
#   ./download-deps.sh maven      # 仅下载 Maven 依赖
#   ./download-deps.sh python     # 仅下载 Python 依赖
#
# 环境要求:
#   - JDK 17+
#   - Maven 3.9+ (或使用项目自带 mvnw)
#   - Python 3.10+ / pip
# ============================================================================

set -euo pipefail

# ---------- 颜色输出 ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()    { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

# ---------- 路径定位 ----------
# 兼容从任意目录调用：脚本所在目录即为 mall-swarm 根
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PROJECT_ROOT="$SCRIPT_DIR"
MAVEN_DIR="$PROJECT_ROOT"            # mall-swarm 根 (pom.xml 所在)
PYTHON_DIR="$PROJECT_ROOT/mall-AI"   # mall-AI 模块

# ---------- 环境检测 ----------
check_command() {
    local cmd="$1"
    local hint="$2"
    if ! command -v "$cmd" >/dev/null 2>&1; then
        warn "未检测到 ${cmd}。${hint}"
        return 1
    fi
    return 0
}

# ---------- Maven 依赖下载 ----------
download_maven() {
    info "========== 开始下载 Maven 后端依赖 =========="

    check_command mvn "请先安装 Maven 3.9+ (https://maven.apache.org/)" || fail "Maven 未安装，无法继续。"

    local mvn_version
    mvn_version=$(mvn -v 2>/dev/null | head -n1 || echo "unknown")
    info "检测到 Maven: ${mvn_version}"

    # 优先使用国内镜像加速（如果 settings.xml 中已配置则跳过提示）
    if [[ ! -f "${HOME}/.m2/settings.xml" ]]; then
        warn "未检测到 ~/.m2/settings.xml，建议配置阿里云镜像加速下载:"
        cat <<'EOF'
    <mirror>
      <id>aliyunmaven</id>
      <mirrorOf>*</mirrorOf>
      <name>阿里云公共仓库</name>
      <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
EOF
    fi

    info "Step 1/2: 下载所有依赖到本地仓库 (go-offline)..."
    mvn dependency:go-offline -DskipTests=true -B \
        || warn "go-offline 部分插件未就绪，继续后续步骤。"

    info "Step 2/2: 编译并安装公共模块 (mall-common / mall-mbg)..."
    # 公共模块需要先 install，其他业务模块依赖它们
    mvn install -pl mall-common,mall-mbg -am -DskipTests=true -B \
        || fail "公共模块安装失败，请检查网络或 Maven 配置。"

    # 全量编译验证依赖完整性（跳过测试）
    info "Step 3/2 (可选): 全量编译验证依赖完整性..."
    if mvn clean install -DskipTests=true -B; then
        success "Maven 全量编译完成，所有依赖就绪。"
    else
        warn "全量编译存在告警/失败，但核心依赖已下载。请按需排查。"
    fi

    success "========== Maven 依赖下载完成 =========="
}

# ---------- Python 依赖下载 ----------
download_python() {
    info "========== 开始下载 Python (mall-AI) 依赖 =========="

    if [[ ! -d "$PYTHON_DIR" ]]; then
        warn "未找到 mall-AI 模块目录: $PYTHON_DIR，跳过 Python 依赖。"
        return 0
    fi

    check_command python3 "请先安装 Python 3.10+ (https://www.python.org/)" \
        || check_command python "请先安装 Python 3.10+" \
        || fail "Python 未安装，无法继续。"

    # 统一 python 命令
    local PY_BIN
    if command -v python3 >/dev/null 2>&1; then
        PY_BIN="python3"
    else
        PY_BIN="python"
    fi

    local py_version
    py_version=$("$PY_BIN" --version 2>&1 || echo "unknown")
    info "检测到 Python: ${py_version}"

    cd "$PYTHON_DIR"

    # 优先使用虚拟环境，避免污染系统包
    local VENV_DIR="$PYTHON_DIR/.venv"
    if [[ ! -d "$VENV_DIR" ]]; then
        info "创建虚拟环境: $VENV_DIR"
        "$PY_BIN" -m venv "$VENV_DIR" \
            || fail "虚拟环境创建失败，请确认 Python venv 模块可用。"
    fi

    # 激活虚拟环境
    # shellcheck disable=SC1091
    source "$VENV_DIR/bin/activate" 2>/dev/null \
        || source "$VENV_DIR/Scripts/activate" 2>/dev/null \
        || fail "虚拟环境激活失败。"

    info "升级 pip..."
    python -m pip install --upgrade pip -i https://pypi.tuna.tsinghua.edu.cn/simple \
        || python -m pip install --upgrade pip

    info "安装 mall-AI 依赖 (requirements.txt)..."
    if [[ -f "requirements.txt" ]]; then
        pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple \
            || pip install -r requirements.txt \
            || fail "Python 依赖安装失败。"
    else
        warn "未找到 requirements.txt，跳过。"
    fi

    # 复制 .env.example 到 .env (如果存在且 .env 不存在)
    if [[ -f ".env.example" && ! -f ".env" ]]; then
        cp .env.example .env
        success "已从 .env.example 创建 .env，请按需修改配置。"
    fi

    success "========== Python 依赖下载完成 =========="
}

# ---------- 主流程 ----------
main() {
    echo -e "${BLUE}"
    echo "============================================================"
    echo "  CBEC-puls 一键依赖下载脚本"
    echo "  项目根: ${PROJECT_ROOT}"
    echo "============================================================"
    echo -e "${NC}"

    local target="${1:-all}"

    case "$target" in
        all)
            download_maven
            echo
            download_python
            ;;
        maven)
            download_maven
            ;;
        python)
            download_python
            ;;
        *)
            fail "未知参数: $target\n用法: $0 [all|maven|python]"
            ;;
    esac

    echo
    success "全部依赖下载流程结束。"
    echo -e "${BLUE}后续步骤:${NC}"
    echo -e "${BLUE}  1) 启动中间件 (docker-compose -f document/docker/docker-compose-env.yml up -d)${NC}"
    echo -e "${BLUE}  2) 在 Nacos 导入 config/ 目录下配置${NC}"
    echo -e "${BLUE}  3) 按 README 顺序启动各微服务${NC}"
}

main "$@"
