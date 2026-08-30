"""
爬虫单元测试：不发真实 HTTP，构造 / Mock 响应，验证解析逻辑的字段完整性。
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


# -------- News: RSS + 正文抽取 --------
def test_extract_readable_html_returns_clean_text():
    from crawlers.news_crawler import _extract_readable_html
    html = """
    <html><head><title>t</title></head>
    <body>
      <script>bad()</script>
      <article>
        <h1>My Title</h1>
        <p>Paragraph one is here.</p>
        <p>Paragraph two is longer text.</p>
      </article>
      <nav><a>skip</a></nav>
    </body></html>
    """
    text = _extract_readable_html(html)
    assert "My Title" in text
    assert "Paragraph one" in text
    assert "bad()" not in text
    assert "skip" not in text


def test_parse_date_variants():
    from crawlers.news_crawler import _parse_date
    from datetime import datetime, timezone
    import time

    assert _parse_date(None) is None
    # feedparser struct_time
    st = time.strptime("2024-01-02 03:04:05", "%Y-%m-%d %H:%M:%S")
    d = _parse_date(st)
    assert d is not None and d.year == 2024 and d.tzinfo is timezone.utc
    # ISO
    d = _parse_date("2024-06-15T10:20:30Z")
    assert d is not None and d.day == 15


def test_weibo_parse_fields():
    """验证微博解析结构被正确标准化为 SocialPost dict。"""
    from crawlers.social_crawler import SocialCrawler
    # 直接调用内部解析片段：模拟正常结构遍历
    crawler = SocialCrawler(request_delay=0)
    realtime = [
        {
            "word": "测试条目",
            "note": "测试条目详细说明",
            "raw_hot": 1234567,
            "label_name": "热",
            "mid": "abc123",
            "scheme": "https://s.weibo.com/weibo?q=%E6%B5%8B%E8%AF%95",
            "onboard_time": 1700000000,
        }
    ]
    # 用 monkey patch 把 fetch 返回假数据
    import json

    class FakeResp:
        def __init__(self, data):
            self._data = data

        def json(self):
            return self._data

    original_fetch = crawler.fetch

    def fake_fetch(url, **kw):
        return FakeResp({"data": {"realtime": realtime}})

    crawler.fetch = fake_fetch  # type: ignore
    try:
        items = crawler._crawl_weibo()
    finally:
        crawler.fetch = original_fetch  # type: ignore

    assert len(items) == 1
    it = items[0]
    assert it["platform"] == "weibo"
    assert it["platform_id"] == "weibo:hot:abc123"
    assert it["engagement"] == 1234567
    assert "测试条目" in (it["content"] or "")
    assert it["posted_at"] is not None


# -------- Papers: arXiv XML 解析 --------
def test_arxiv_xml_parse_extracts_expected_fields():
    SAMPLE = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2301.00001v2</id>
    <published>2023-01-01T00:00:00Z</published>
    <updated>2023-01-02T00:00:00Z</updated>
    <title>A Novel  Test  Model </title>
    <summary>This paper proposes a novel model for testing. We achieve state-of-the-art results on several benchmarks.</summary>
    <author><name>Alice One</name></author>
    <author><name>Bob Two</name></author>
    <link title="pdf" href="http://arxiv.org/pdf/2301.00001" type="application/pdf"/>
    <category term="cs.AI"/>
    <category term="cs.CL"/>
  </entry>
</feed>"""
    from crawlers.paper_crawler import PaperCrawler
    import requests

    crawler = PaperCrawler(request_delay=0)
    orig = crawler.fetch

    def fake(url, **kw):
        r = requests.Response()
        r.status_code = 200
        r._content = SAMPLE.encode("utf-8")
        return r

    crawler.fetch = fake  # type: ignore
    try:
        items = crawler._crawl_arxiv()
    finally:
        crawler.fetch = orig  # type: ignore

    assert len(items) == 1
    it = items[0]
    assert it["source"] == "arXiv"
    assert it["paper_id"] == "arxiv:2301.00001v2"
    assert "A Novel Test Model" in it["title"]
    assert "Alice One" in (it["authors"] or "")
    assert "Bob Two" in (it["authors"] or "")
    assert it["pdf_url"] == "http://arxiv.org/pdf/2301.00001"
    assert "cs.AI" in (it["keywords"] or "")
    assert it["published_at"] is not None
    assert it["abstract"] is not None
