---
name: FastAPI后端进程热重载问题
description: 修改代码后需要完全重启进程才能生效
type: project
---

## 经验
FastAPI 的 `--reload` 模式有时无法正确加载代码变更，特别是修改 Pydantic 模型后。必须完全杀掉进程再启动才能生效。

**Why**: `--reload` 使用文件监视器，有时缓存或延迟导致新代码不加载。

**How to apply**:
```bash
# Windows 强制重启
powershell -Command "Get-Process python | Stop-Process -Force"
# 或
pkill -f uvicorn

# 然后重新启动
cd backend
python -m uvicorn api:app --host 127.0.0.1 --port 8000 --reload
```

**验证方法**: 修改代码后添加调试日志，确认新版本已加载。

## 时间
2026-04-02
