<#
.SYNOPSIS
mall‑swarm 项目依赖初始化脚本
#>

$ErrorActionPreference = "Continue"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "      mall‑swarm 环境初始化脚本      " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan


# 进入 mall‑swarm 目录
$rootDir = Join-Path $PWD.Path "mall-swarm"
if (-not (Test-Path $rootDir)) {
    Write-Host "[错误] 目录不存在: $rootDir" -ForegroundColor Red
    pause
    exit 1
}
Set-Location $rootDir

Write-Host "`n[1] Maven 安装 Java 依赖" -ForegroundColor Green
Write-Host ">> 自行下载所需要的依赖"
mvn install


###########################
# mall‑AI 虚拟环境
###########################
Write-Host "`n[2] 初始化 mall‑AI Python 虚拟环境" -ForegroundColor Green
Set-Location "mall-AI"

# 创建虚拟环境
$venvAiPath = ".\.mall-AI"
python -m venv $venvAiPath

# 激活虚拟环境
$activateAi = Join-Path $venvAiPath "Scripts\Activate.ps1"
. $activateAi

# 安装依赖
pip install -r "requirements.txt"

# 退出虚拟环境
deactivate

Set-Location ..


###########################
# mall‑new 虚拟环境
###########################
Write-Host "`n[3] 初始化 mall‑new Python 虚拟环境" -ForegroundColor Green
Set-Location "mall-new"

$venvNewPath = ".\.mall-new"
python -m venv $venvNewPath

$activateNew = Join-Path $venvNewPath "Scripts\Activate.ps1"
. $activateNew

pip install -r "requirements.txt"
deactivate

Set-Location ../..


###########################
# wed pnpm 依赖
###########################
Write-Host "`n[4] 初始化 wed pnpm 依赖" -ForegroundColor Green
Set-Location "wed"
pnpm i


Write-Host "`n✅ 全部依赖执行完成！" -ForegroundColor Green
pause