"""启动 FastAPI 服务器"""

from dotenv import load_dotenv
from pathlib import Path

# 加载环境变量（显式指定 .env 文件路径）
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host="127.0.0.1",
        port=8000,
        reload=False
    )