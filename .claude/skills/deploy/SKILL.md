---
description: 部署状态检查 — Vercel前端 + Render后端 + GitHub Actions TMDB同步
allowed-tools: [Bash]
argument-hint: "[frontend|backend|sync] — 指定检查项，不指定则全部检查"
---

## 步骤

依次检查以下三项，最后汇总展示：

### 1. 后端 (Render)
```bash
curl -s -o /dev/null -w "HTTP %{http_code} | 响应时间 %{time_total}s" https://movie-recommend-system-aiea.onrender.com/api/health 2>/dev/null || echo "无法连接"
```
- 200 = 正常 | 非200 = 异常 | 无法连接 = 休眠中

### 2. 前端 (Vercel)
```bash
curl -s -o /dev/null -w "HTTP %{http_code} | 响应时间 %{time_total}s" https://frontend-henna-omega-96.vercel.app 2>/dev/null || echo "无法连接"
```
- 200 = 正常

### 3. TMDB 同步 (GitHub Actions)
```bash
gh run list --repo leo2005666-spec/movie-recommend-system --workflow sync-movies.yml --limit 3 2>/dev/null || echo "gh CLI 未登录，请先执行 gh auth login"
```
- 显示最近3次同步状态

### 4. 汇总
用简洁表格展示所有结果。如有异常给出建议：
- Render 休眠 → 访问一次后端 URL 即可唤醒（约30秒冷启动）
- gh 未登录 → 提示执行 `gh auth login`
- 同步失败 → 提示查看 GitHub Actions 日志

## 重要
- 结果用中文展示
- 如果 `$ARGUMENTS` 指定了具体项目，只检查指定项
