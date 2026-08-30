"""
学术论文爬虫：
  1) arXiv  -> 官方 export.arxiv.org Atom API（免 Key，合规）
  2) PubMed -> NCBI E-utilities esearch + efetch（免 Key）
  3) IEEE / Springer -> 预留 API Key，缺失时自动跳过（避免无意义失败）
"""
from __future__ import annotations

import logging
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import urlencode

from config import settings
from crawlers.base import BaseCrawler
from app import crud

logger = logging.getLogger(__name__)


def _parse_iso_date(val: Optional[str]) -> Optional[datetime]:
    if not val:
        return None
    s = val.strip()
    try:
        # 常见格式：YYYY-MM-DD / YYYY-MM / YYYY
        for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d", "%Y-%m"):
            try:
                d = datetime.strptime(s[: len(fmt) + 4 if fmt != "%Y" else 4], fmt)
                if d.tzinfo is None:
                    d = d.replace(tzinfo=timezone.utc)
                return d
            except ValueError:
                continue
        # 最后尝试 ISO
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:  # noqa: BLE001
        return None


# ---------- arXiv ----------
NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
    "opensearch": "http://a9.com/-/spec/opensearch/1.1/",
}


class PaperCrawler(BaseCrawler):
    name = "PaperCrawler"
    _bulk_fn = staticmethod(crud.bulk_upsert_papers)

    def __init__(self, request_delay: Optional[float] = None):
        super().__init__(request_delay or settings.crawl_paper_delay)

    # ------- arXiv -------
    def _crawl_arxiv(self, max_results: int = 40) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        params = {
            "search_query": "cat:cs.AI OR cat:cs.CL OR cat:cs.LG OR cat:stat.ML",
            "start": 0,
            "max_results": max_results,
            "sortBy": "submittedDate",
            "sortOrder": "descending",
        }
        url = f"http://export.arxiv.org/api/query?{urlencode(params)}"
        resp = self.fetch(url, timeout=30)
        if not resp:
            return out
        try:
            root = ET.fromstring(resp.content)
        except ET.ParseError as exc:
            logger.warning("arXiv XML 解析失败：%s", exc)
            return out

        for entry in root.findall("atom:entry", NS):
            try:
                raw_title = (entry.findtext("atom:title", default="", namespaces=NS) or "").strip()
                title = re.sub(r"\s+", " ", raw_title)
                if not title:
                    continue
                id_url = entry.findtext("atom:id", default="", namespaces=NS).strip()
                m = re.search(r"abs/([^\s?]+)", id_url)
                arxiv_id = m.group(1) if m else id_url
                abstract = (entry.findtext("atom:summary", default="", namespaces=NS) or "").strip()

                authors = []
                for a in entry.findall("atom:author", NS):
                    name = a.findtext("atom:name", default="", namespaces=NS).strip()
                    if name:
                        authors.append(name)

                published = _parse_iso_date(entry.findtext("atom:published", default="", namespaces=NS))
                updated = _parse_iso_date(entry.findtext("atom:updated", default="", namespaces=NS))

                pdf_url = None
                for link in entry.findall("atom:link", NS):
                    if link.attrib.get("title") == "pdf" or link.attrib.get("type") == "application/pdf":
                        pdf_url = link.attrib.get("href")
                        break
                doi = entry.findtext("arxiv:doi", default=None, namespaces=NS)
                categories = [c.attrib.get("term") for c in entry.findall("atom:category", NS) if c.attrib.get("term")]

                out.append({
                    "source": "arXiv",
                    "title": title,
                    "paper_id": f"arxiv:{arxiv_id}",
                    "authors": ", ".join(authors) or None,
                    "abstract": abstract or None,
                    "summary": None,
                    "keywords": ", ".join(categories) or None,
                    "pdf_url": pdf_url,
                    "doi": doi,
                    "published_at": published or updated,
                    "content_hash": None,
                    "crawled_at": datetime.utcnow(),
                })
            except Exception as exc:  # noqa: BLE001
                logger.warning("arXiv 单条解析失败：%s", exc)
                continue
        logger.info("[arXiv] 抓取 %d 条", len(out))
        return out

    # ------- PubMed -------
    def _crawl_pubmed(self, max_results: int = 30) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        # Step 1: esearch
        search_params = {
            "db": "pubmed",
            "term": "artificial intelligence OR deep learning OR large language model",
            "retmax": max_results,
            "retmode": "json",
            "sort": "date",
        }
        url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?{urlencode(search_params)}"
        resp = self.fetch(url, timeout=20)
        if not resp:
            return out
        try:
            ids = resp.json().get("esearchresult", {}).get("idlist", [])
        except Exception as exc:  # noqa: BLE001
            logger.warning("PubMed esearch 解析失败：%s", exc)
            return out
        if not ids:
            return out

        # Step 2: efetch xml
        fetch_params = {"db": "pubmed", "id": ",".join(ids), "retmode": "xml"}
        url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?{urlencode(fetch_params)}"
        resp = self.fetch(url, timeout=30)
        if not resp:
            return out
        try:
            root = ET.fromstring(resp.content)
        except ET.ParseError as exc:
            logger.warning("PubMed efetch XML 解析失败：%s", exc)
            return out

        for article in root.findall(".//PubmedArticle"):
            try:
                pmid_el = article.find(".//PMID")
                pmid = pmid_el.text if pmid_el is not None and pmid_el.text else None
                if not pmid:
                    continue
                title_el = article.find(".//ArticleTitle")
                title = "".join(title_el.itertext()) if title_el is not None else ""
                if not title.strip():
                    continue

                abs_paras = article.findall(".//AbstractText")
                abstract_parts = []
                for p in abs_paras:
                    label = p.attrib.get("Label", "")
                    txt = "".join(p.itertext()).strip()
                    if txt:
                        abstract_parts.append((f"{label}: " if label else "") + txt)
                abstract = "\n".join(abstract_parts).strip() or None

                authors = []
                for a in article.findall(".//Author"):
                    ln = a.findtext("LastName", default="")
                    fn = a.findtext("ForeName", default="")
                    name = f"{ln} {fn}".strip()
                    if not name:
                        col = a.findtext("CollectiveName")
                        name = col or ""
                    if name:
                        authors.append(name)

                kwds = [k.text.strip() for k in article.findall(".//Keyword") if k.text and k.text.strip()]

                # 日期：PubDate 可能 Year/Month/Day 分别
                pubdate = article.find(".//PubDate")
                year = month = day = None
                if pubdate is not None:
                    year = pubdate.findtext("Year")
                    month = pubdate.findtext("Month")
                    day = pubdate.findtext("Day")
                published = None
                if year:
                    ds = year
                    if month:
                        ds += f"-{month}"
                        if day:
                            ds += f"-{day}"
                    published = _parse_iso_date(ds)

                doi = None
                for aid in article.findall(".//ArticleId"):
                    if aid.attrib.get("IdType") == "doi" and aid.text:
                        doi = aid.text
                        break

                out.append({
                    "source": "PubMed",
                    "title": title.strip(),
                    "paper_id": f"pmid:{pmid}",
                    "authors": ", ".join(authors) or None,
                    "abstract": abstract,
                    "summary": None,
                    "keywords": ", ".join(kwds[:20]) or None,
                    "pdf_url": None,
                    "doi": doi,
                    "published_at": published,
                    "content_hash": None,
                    "crawled_at": datetime.utcnow(),
                })
            except Exception as exc:  # noqa: BLE001
                logger.warning("PubMed 单条解析失败：%s", exc)
                continue

        logger.info("[PubMed] 抓取 %d 条", len(out))
        return out

    # ------- IEEE / Springer（需 Key）-------
    def _crawl_ieee(self, max_results: int = 20) -> list[dict[str, Any]]:
        """IEEE Xplore 元数据搜索（有 Key 时启用）。"""
        key = settings.ieee_api_key
        if not key:
            return []
        params = {
            "apikey": key,
            "querytext": "artificial intelligence",
            "max_records": max_results,
            "start_record": 1,
            "format": "json",
        }
        url = f"https://ieeexploreapi.ieee.org/api/v1/search/articles?{urlencode(params)}"
        resp = self.fetch(url, timeout=20)
        if not resp:
            return []
        out: list[dict[str, Any]] = []
        try:
            data = resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.warning("IEEE JSON 解析失败：%s", exc)
            return out
        for a in data.get("articles", []):
            try:
                title = (a.get("title") or "").strip()
                paper_id = str(a.get("article_number") or a.get("doi") or "")
                if not title or not paper_id:
                    continue
                authors_list = [x.get("full_name") for x in (a.get("authors", {}).get("authors", []) or []) if x.get("full_name")]
                kwds = []
                for k in (a.get("index_terms") or {}).values():
                    if isinstance(k, dict):
                        terms = k.get("terms") or []
                        kwds.extend(terms)
                out.append({
                    "source": "IEEE",
                    "title": title,
                    "paper_id": f"ieee:{paper_id}",
                    "authors": ", ".join(authors_list) or None,
                    "abstract": (a.get("abstract") or "").strip() or None,
                    "summary": None,
                    "keywords": ", ".join(str(x) for x in kwds[:30]) or None,
                    "pdf_url": a.get("pdf_url"),
                    "doi": a.get("doi"),
                    "published_at": _parse_iso_date(a.get("publication_date") or a.get("publication_year")),
                    "content_hash": None,
                    "crawled_at": datetime.utcnow(),
                })
            except Exception as exc:  # noqa: BLE001
                logger.warning("IEEE 单条解析失败：%s", exc)
        logger.info("[IEEE] 抓取 %d 条", len(out))
        return out

    def _crawl_springer(self, max_results: int = 20) -> list[dict[str, Any]]:
        key = settings.springer_api_key
        if not key:
            return []
        params = {
            "q": "machine learning",
            "api_key": key,
            "p": max_results,
            "s": 1,
        }
        url = f"https://api.springernature.com/meta/v2/json?{urlencode(params)}"
        resp = self.fetch(url, timeout=20)
        if not resp:
            return []
        out: list[dict[str, Any]] = []
        try:
            records = resp.json().get("records", [])
        except Exception as exc:  # noqa: BLE001
            logger.warning("Springer JSON 解析失败：%s", exc)
            return out
        for r in records:
            try:
                title = (r.get("title") or "").strip()
                doi = r.get("doi") or r.get("identifier") or ""
                if not title or not doi:
                    continue
                creators = [c.get("creator") for c in (r.get("creators") or []) if c.get("creator")]
                kwds = [k for k in (r.get("keyword") or []) if isinstance(k, str)]
                url_list = r.get("url") or []
                pdf_url = None
                for u in url_list:
                    if u.get("format") == "pdf":
                        pdf_url = u.get("value")
                        break
                out.append({
                    "source": "Springer",
                    "title": title,
                    "paper_id": f"springer:{doi}",
                    "authors": ", ".join(creators) or None,
                    "abstract": (r.get("abstract") or "").strip() or None,
                    "summary": None,
                    "keywords": ", ".join(kwds[:30]) or None,
                    "pdf_url": pdf_url,
                    "doi": doi,
                    "published_at": _parse_iso_date(r.get("publicationDate") or r.get("publication_date")),
                    "content_hash": None,
                    "crawled_at": datetime.utcnow(),
                })
            except Exception as exc:  # noqa: BLE001
                logger.warning("Springer 单条解析失败：%s", exc)
        logger.info("[Springer] 抓取 %d 条", len(out))
        return out

    # ------- 汇总 -------
    def crawl_items(self) -> list[dict[str, Any]]:
        all_items: list[dict[str, Any]] = []
        all_items.extend(self._crawl_arxiv())
        all_items.extend(self._crawl_pubmed())
        all_items.extend(self._crawl_ieee())
        all_items.extend(self._crawl_springer())
        return all_items
