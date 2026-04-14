"""
AI 客户端模块 - 使用 DeepSeek 官方 API 进行文本杂交
"""

import os
from openai import AsyncOpenAI

# 延迟初始化的客户端
_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    """获取或初始化 OpenAI 客户端"""
    global _client
    if _client is None:
        api_key = os.getenv("DEEPSEEK_API_KEY")
        base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
        print(f"[AI客户端] 初始化: base_url={base_url}, api_key={'已设置' if api_key else '未设置'}")
        _client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url
        )
    return _client


# 模型名称
MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")


async def hybrid_text(content1: str, content2: str, dna_prompt1: str | None = None, dna_prompt2: str | None = None) -> str | None:
    """
    融合两个文本片段，使用拼贴诗方法生成杂交文学。

    Args:
        content1: 第一个文本片段
        content2: 第二个文本片段
        dna_prompt1: 真菌A的DNA倾向提示词
        dna_prompt2: 真菌B的DNA倾向提示词

    Returns:
        融合后的文本，如果 API 调用失败则返回 None
    """
    system_prompt = """你是一个拼贴诗人。将两段文本拆碎再重组，制造矛盾而连贯的杂交文学。

方法：
1. 把两段文本各自拆成3-5字的碎片（如"很微妙的""非人感""分秒的""物质"）
2. 从两段文本的碎片中挑选，交错排列，用换行、空格控制节奏
3. 同一碎片可重复出现，制造回声
4. 允许极简连接词（的、了、而、却），但禁止整句照搬或合并

约束：只能使用当前给定的两段文本中的字词碎片，严禁引入任何外部词句或上文未出现的素材。

美学目标：碎片之间应产生碰撞，让读者同时感到两段文本的引力。保留原文本的断行节奏和味道。"""

    user_message = f"文本A：{content1}\n\n文本B：{content2}"

    # DNA综合机制：根据DNA提示词情况拼接额外内容
    if dna_prompt1 and dna_prompt2:
        user_message += f"\n\n【真菌A的倾向】{dna_prompt1}\n【真菌B的倾向】{dna_prompt2}\n请在平均分配双方倾向的基础上进行拼贴。"
    elif dna_prompt1:
        user_message += f"\n\n【真菌A的倾向】{dna_prompt1}\n【真菌B无特殊倾向】"
    elif dna_prompt2:
        user_message += f"\n\n【真菌A无特殊倾向】\n【真菌B的倾向】{dna_prompt2}"

    print(f"[AI杂交] 开始调用API... 模型={MODEL}")
    print(f"[AI杂交] 输入1: {content1[:50]}...")
    print(f"[AI杂交] 输入2: {content2[:50]}...")
    if dna_prompt1:
        print(f"[AI杂交] DNA1: {dna_prompt1}")
    if dna_prompt2:
        print(f"[AI杂交] DNA2: {dna_prompt2}")

    try:
        client = get_client()
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.9,
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