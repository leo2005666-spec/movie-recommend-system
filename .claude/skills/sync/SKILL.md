---
description: 触发TMDB电影数据同步 — 调用GitHub Actions workflow
allowed-tools: [Bash]
argument-hint: "[full] — 全量同步；默认增量同步"
---

## 步骤

1. 判断模式：
   - `$ARGUMENTS` 含 "full" → workflow 文件 `sync-movies-full.yml`，全量同步（约10-15分钟）
   - 默认 → workflow 文件 `sync-movies.yml`，增量同步（约2-3分钟）

2. 触发 workflow：
```bash
gh workflow run <workflow-file> --repo leo2005666-spec/movie-recommend-system
```

3. 确认触发成功（等待2秒后查看最新 run）：
```bash
sleep 2 && gh run list --repo leo2005666-spec/movie-recommend-system --workflow <workflow-file> --limit 1
```

4. 告知用户：
   - workflow 名称和触发时间
   - 预计完成时间
   - GitHub Actions 查看链接：https://github.com/leo2005666-spec/movie-recommend-system/actions

## 重要规则

- 触发前告知用户正在触发哪个同步模式
- 如果 gh CLI 未登录，提示执行 `gh auth login`
- 不要等待 workflow 完成，触发后直接报告结果
- 结果用中文展示
