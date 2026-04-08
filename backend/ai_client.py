"""
AI 客户端模块 - 使用 SiliconFlow API 进行文本杂交
"""

import os
from openai import AsyncOpenAI

# 延迟初始化的客户端
_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    """获取或初始化 OpenAI 客户端"""
    global _client
    if _client is None:
        api_key = os.getenv("SILICONFLOW_API_KEY")
        base_url = os.getenv("SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1")
        print(f"[AI客户端] 初始化: base_url={base_url}, api_key={'已设置' if api_key else '未设置'}")
        _client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url
        )
    return _client


# 模型名称
MODEL = os.getenv("SILICONFLOW_MODEL", "deepseek-ai/DeepSeek-V3.2")


async def hybrid_text(content1: str, content2: str) -> str | None:
    """
    融合两个文本片段的核心概念，生成新的创意文本。

    Args:
        content1: 第一个文本片段
        content2: 第二个文本片段

    Returns:
        融合后的文本，如果 API 调用失败则返回 None
    """
    prompt = f"""你是一个创意文本融合助手。请融合以下两个文本片段的核心概念，生成一段新的、有创意的文本（不超过200字）：

文本1: {content1}

文本2: {content2}

请输出融合后的文本，不要包含解释："""

    print(f"[AI杂交] 开始调用API... 模型={MODEL}")
    print(f"[AI杂交] 输入1: {content1[:50]}...")
    print(f"[AI杂交] 输入2: {content2[:50]}...")

    try:
        client = get_client()
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=300
        )

        result = response.choices[0].message.content.strip()
        print(f"[AI杂交] 成功! 结果: {result[:100]}...")
        return result

    except Exception as e:
        print(f"[AI杂交] 失败: {e}")
        import traceback
        traceback.print_exc()
        return None
