# ============================================================
# 清空云数据库中的 OMBd 电影，改用 TMDB 数据
# ============================================================
# 使用前请按下面提示填写你的密钥，然后在此目录运行：
#   .\执行-清空OMDb改用TMDB.ps1
# 或右键 → 用 PowerShell 运行
# ============================================================

# ---------- 请填写以下三个值（从 Render / TMDB 获取）----------
$env:TURSO_DATABASE_URL = "你的Turso数据库地址"    # 从 Render 环境变量复制
$env:TURSO_AUTH_TOKEN   = "你的Turso令牌"          # 从 Render 环境变量复制
$env:TMDB_API_KEY       = "你的TMDB_Key"            # 从 https://www.themoviedb.org/settings/api 申请

# ---------- 校验：未填写会提示 ----------
if ($env:TURSO_DATABASE_URL -like "*你的*" -or $env:TURSO_AUTH_TOKEN -like "*你的*") {
    Write-Host "错误：请先编辑本脚本，填写 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN" -ForegroundColor Red
    Write-Host "可从 Render 控制台 → 你的后端服务 → Environment 复制" -ForegroundColor Yellow
    exit 1
}
if ($env:TMDB_API_KEY -like "*你的*") {
    Write-Host "错误：请先编辑本脚本，填写 TMDB_API_KEY" -ForegroundColor Red
    Write-Host "申请地址：https://www.themoviedb.org/settings/api" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n即将清空云数据库中的旧电影，并导入 TMDB 数据..." -ForegroundColor Cyan
Write-Host "请确认：1) 已停止后端服务  2) 已填写正确的 Turso 与 TMDB 密钥`n" -ForegroundColor Yellow
$confirm = Read-Host "输入 Y 继续，其他键取消"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "已取消" -ForegroundColor Gray
    exit 0
}

Write-Host "`n开始执行..." -ForegroundColor Green
npm run crawler:replace
