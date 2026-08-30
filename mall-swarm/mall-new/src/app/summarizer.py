"""
内容摘要模块：多策略混合
  - 超短文本（<300 字）：直接取前 N 字
  - 英文长文：summa（TextRank，无模型依赖）
  - 中文长文：jieba 分句 + 词频打分取 Top-3
  - 任何异常 -> 降级为首段 200 字
"""
from __future__ import annotations

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# 简单检测：中文字符比例 > 20% 判定为中文
_CN_RE = re.compile(r"[\u4e00-\u9fff]")


def _is_chinese(text: str, threshold: float = 0.2) -> bool:
    if not text:
        return False
    cn = len(_CN_RE.findall(text))
    total = max(1, len(text))
    return (cn / total) >= threshold


def _split_sentences_chinese(text: str) -> list[str]:
    """中文分句：按 。！？；\n 切分，再去空、trim。"""
    parts = re.split(r"[。！？；!?;\n]+", text)
    return [p.strip() for p in parts if p.strip()]


def _split_sentences_english(text: str) -> list[str]:
    """英文分句：按 . ! ? 后接空格或字符串结尾 切分。"""
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p.strip() for p in parts if len(p.strip()) > 10]


def _tfidf_summary(sentences: list[str], top_n: int = 3, max_len: int = 300) -> str:
    """简单词频打分：按句子词频总和排序，取 Top-N 再按原顺序拼接。"""
    if not sentences:
        return ""
    # 停用词简单版（避免额外依赖）
    stop = set(list("的了是和在也有就都与及或而但这那一个及与其被把对从到为将等"))
    stop |= {
        "the", "a", "an", "and", "or", "but", "is", "are", "was", "were",
        "to", "of", "in", "on", "at", "for", "with", "that", "this", "it",
        "as", "by", "be", "been", "being", "have", "has", "had", "do", "does",
    }

    # tokenize
    def tokenize(s: str) -> list[str]:
        if _is_chinese(s):
            # 不依赖 jieba 分词，按字符取（加上 jieba 更好，但缺失时也能用）
            try:
                import jieba  # type: ignore
                return [w for w in jieba.lcut(s) if len(w.strip()) > 0 and w not in stop]
            except Exception:  # noqa: BLE001
                return [c for c in s if c.strip() and c not in stop]
        else:
            return [w.lower() for w in re.findall(r"[A-Za-z]+", s) if w.lower() not in stop and len(w) > 2]

    # 全局词频
    freq: dict[str, int] = {}
    sent_tokens: list[list[str]] = []
    for s in sentences:
        toks = tokenize(s)
        sent_tokens.append(toks)
        for t in toks:
            freq[t] = freq.get(t, 0) + 1

    # 句子打分
    scored = []
    for idx, toks in enumerate(sent_tokens):
        if not toks:
            scored.append((idx, 0.0))
            continue
        score = sum(freq.get(t, 0) for t in toks) / len(toks)
        scored.append((idx, score))

    # 取 Top-N 按原顺序
    top_idx = sorted([i for i, _ in sorted(scored, key=lambda x: -x[1])[:top_n]])
    picked = [sentences[i] for i in top_idx]
    result = "。".join(picked) if _is_chinese("".join(picked)) else ". ".join(picked)
    if len(result) > max_len:
        result = result[:max_len] + "…"
    return result


def _summa_summary(text: str, max_len: int = 300) -> Optional[str]:
    try:
        from summa import summarizer  # type: ignore
        ratio = max(0.05, min(0.3, max_len / max(len(text), 1)))
        return summarizer.summarize(text, ratio=ratio) or None
    except Exception as exc:  # noqa: BLE001
        logger.debug("summa 摘要失败：%s", exc)
        return None


def summarize_text(text: str, max_len: int = 300) -> str:
    """统一摘要入口。任何异常都降级为截取首段，不抛异常。"""
    if not text:
        return ""
    text = text.strip()
    # 1) 超短文本直接返回（精简尾缀）
    if len(text) <= max_len:
        return text

    try:
        # 2) 英文：优先 summa
        if not _is_chinese(text):
            s = _summa_summary(text, max_len=max_len)
            if s and len(s) > 40:
                return s[:max_len] + ("…" if len(s) > max_len else "")

        # 3) 中文/失败回退 -> TF-IDF 句打分
        sents = _split_sentences_chinese(text) if _is_chinese(text) else _split_sentences_english(text)
        if len(sents) >= 2:
            s = _tfidf_summary(sents, top_n=min(4, max(2, len(sents) // 4)), max_len=max_len)
            if s and len(s) > 30:
                return s

    except Exception as exc:  # noqa: BLE001
        logger.warning("摘要生成异常，降级截取：%s", exc)

    # 4) 最终降级：首段 max_len 字符
    snippet = text[:max_len].rstrip()
    if len(text) > max_len:
        snippet += "…"
    return snippet
