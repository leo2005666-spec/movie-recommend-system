#!/usr/bin/env bash
# Linux/macOS：常驻 TMDB 定时同步。用法：chmod +x start-crawler-cron.sh && ./start-crawler-cron.sh
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -f .env ]]; then
  echo "提示: 复制 .env.example 为 .env 并填写 TMDB_API_KEY"
fi
echo "TMDB 定时爬虫（Ctrl+C 停止）"
npm run crawler:cron
