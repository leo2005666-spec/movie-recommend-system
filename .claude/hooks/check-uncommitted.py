#!/usr/bin/env python3
"""检查未提交变更的 hook 脚本
用于 PostToolUse（编辑文件后）和 Stop（停止前）事件
"""
import sys
import json
import subprocess


def count_uncommitted():
    """返回未提交文件数"""
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True, text=True, timeout=5,
            cwd="/Users/lym/毕设/movie-recommend-system"
        )
        lines = [l for l in result.stdout.strip().split("\n") if l]
        return len(lines)
    except Exception:
        return 0


def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except Exception:
        sys.exit(0)

    event = input_data.get("hook_event_name", "")
    tool_name = input_data.get("tool_name", "")

    # PostToolUse: 只在编辑/写入文件后检查
    if event == "PostToolUse" and tool_name in ("Edit", "Write", "MultiEdit"):
        count = count_uncommitted()
        if count >= 5:
            print(json.dumps({
                "systemMessage": f"⚠️ 已有 {count} 个文件变更未提交，建议 /ship 一键推送"
            }))
        elif count >= 3:
            print(json.dumps({
                "systemMessage": f"📝 {count} 个文件已修改，改动多起来记得 /ship"
            }))

    # Stop: 停止前检查是否有未提交内容
    elif event == "Stop":
        count = count_uncommitted()
        if count > 0:
            print(json.dumps({
                "systemMessage": f"📝 还有 {count} 个文件未提交！先 /ship 再走？"
            }))

    sys.exit(0)


if __name__ == "__main__":
    main()
