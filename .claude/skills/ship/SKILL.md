---
description: 一键提交推送 — 查看变更、生成中文commit、add→commit→push
allowed-tools: [Bash]
argument-hint: "[额外描述] — 补充到commit message"
---

## 步骤

1. 执行以下命令了解变更范围：
```bash
git status && echo "---DIFF STAT---" && git diff --stat && echo "---DIFF DETAIL---" && git diff --cached --stat 2>/dev/null
```

2. 根据 diff 内容生成中文 commit message，格式：`<动作>: <改动简述>`
   - 动作：新增 / 修复 / 优化 / 重构 / 更新 / 删除
   - 如果用户提供了 `$ARGUMENTS`，将其作为补充描述追加到 message
   - message 控制在 50 字以内

3. 执行提交推送：
```bash
git add . && git commit -m "<生成的中文message>" && git push
```

4. 报告 commit hash 和 push 结果

## 重要规则

- commit message 必须用中文
- 不要询问用户确认，直接执行
- 如果 `git status` 显示 working tree clean，直接告知用户"没有需要提交的变更"
- 如果 push 失败（如网络问题），报告错误信息
