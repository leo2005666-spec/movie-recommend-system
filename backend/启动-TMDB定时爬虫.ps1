# 常驻运行 TMDB 定时同步（node-cron，默认每 30 分钟 + 每源 1 页快速增量）
# 用法：在 backend 目录双击本脚本，或在 PowerShell 中执行：
#   .\启动-TMDB定时爬虫.ps1
# 停止：在窗口中按 Ctrl+C
#
# 开机自启：任务计划程序 → 创建任务 → 触发器「用户登录时」→ 操作启动程序：
#   powershell.exe
# 参数：-NoProfile -ExecutionPolicy Bypass -File "此处填本脚本完整路径"
# 起始于：本脚本所在目录（backend）

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "  [提示] 未找到 backend\.env" -ForegroundColor Yellow
    Write-Host "  请复制 .env.example 为 .env，并填写 TMDB_API_KEY" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "TMDB 定时爬虫（读取 .env 中的 TMDB_CRAWLER_CRON，默认每 30 分钟）" -ForegroundColor Cyan
Write-Host "工作目录: $here" -ForegroundColor DarkGray
Write-Host "按 Ctrl+C 停止`n" -ForegroundColor DarkGray

npm run crawler:cron
