// 文章专栏页：搜索 + 分类筛选 + 横向卡片 + 分页
// 数据源：mall-ArticleSummary 后端 /article/list，后端不可用时降级到本地 mock
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  SearchOutlined,
  UserOutlined,
  ClockCircleOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import RevealOnScroll from "@/reception/components/RevealOnScroll";
import { getArticleListApi } from "@/services/article";
import "./Article.css";
import type { ArticleVO } from "@/types/api";

const ARTICLE_CATS = [
  "全部",
  "动画评论",
  "漫画书评",
  "游戏攻略",
  "音乐推荐",
  "同人创作",
];

/** 本地 mock 文章（后端不可用时的降级数据） */
interface LocalArticle {
  title: string;
  cat: string;
  cover: [string, string];
  summary: string;
  author: string;
  authorColor: [string, string];
  date: string;
}

const LOCAL_ARTICLES: LocalArticle[] = [
  {
    title: "《赛博朋克：边缘行者》：霓虹灯下的悲剧浪漫",
    cat: "动画评论",
    cover: ["#ff6b9d", "#5b5bff"],
    summary: "扳机社用十集讲完了一个关于爱与梦想的赛博朋克故事。",
    author: "夜之城幽灵",
    authorColor: ["#ff6b9d", "#c084fc"],
    date: "2026-08-10",
  },
  {
    title: "《葬送的芙莉莲》漫画完结纪念：时间与记忆的魔法诗",
    cat: "漫画书评",
    cover: ["#6bc8ff", "#ffb3d9"],
    summary: "山田钟人用细腻的笔触描绘了精灵魔法使芙莉莲跨越千年的旅程。",
    author: "魔法使的弟子",
    authorColor: ["#6bc8ff", "#7dd3fc"],
    date: "2026-08-08",
  },
  {
    title: "《原神》4.8 深渊攻略：配队思路与满星教学",
    cat: "游戏攻略",
    cover: ["#b084ff", "#6bc8ff"],
    summary: "本期深渊上下半环境分析，推荐三套稳定满星配队方案。",
    author: "提瓦特图鉴",
    authorColor: ["#a78bfa", "#60a5fa"],
    date: "2026-08-06",
  },
  {
    title: "2026 夏季动漫音乐精选：OP/ED 神曲盘点",
    cat: "音乐推荐",
    cover: ["#ffd86b", "#ff7a59"],
    summary: "本季最值得循环播放的动漫音乐合集。",
    author: "音之守护灵",
    authorColor: ["#fbbf24", "#f97316"],
    date: "2026-08-04",
  },
  {
    title: "【同人本推荐】Comiket 102 精选必购清单",
    cat: "同人创作",
    cover: ["#ff9ed0", "#7e6bff"],
    summary: "今年夏 CM 最值得入手的 20 本同人志。",
    author: "漫展情报站",
    authorColor: ["#f472b6", "#8b5cf6"],
    date: "2026-08-02",
  },
  {
    title: "《水星的魔女》：Gundam 系列的青春革命",
    cat: "动画评论",
    cover: ["#ff5b8e", "#ffaa6b"],
    summary: "大河内一楼用校园恋爱、企业斗争与 MS 战斗重新定义了高达系列。",
    author: "UC 年代史学家",
    authorColor: ["#fb7185", "#fb923c"],
    date: "2026-07-30",
  },
];

/** 统一渲染项：后端 ArticleVO 或本地 LocalArticle 均可映射 */
interface ArticleItem {
  id: string;
  title: string;
  cat: string;
  cover: [string, string];
  summary: string;
  author: string;
  authorColor: [string, string];
  date: string;
}

const COVER_COLORS: [string, string][] = [
  ["#667eea", "#764ba2"],
  ["#f093fb", "#f5576c"],
  ["#4facfe", "#00f2fe"],
  ["#43e97b", "#38f9d7"],
  ["#fa709a", "#fee140"],
  ["#a8edea", "#fed6e3"],
];

const AUTHOR_COLORS: [string, string][] = [
  ["#ff6b9d", "#c084fc"],
  ["#6bc8ff", "#7dd3fc"],
  ["#a78bfa", "#60a5fa"],
  ["#fbbf24", "#f97316"],
  ["#f472b6", "#8b5cf6"],
];

/** 后端 ArticleVO → 统一 ArticleItem */
function adaptArticle(vo: ArticleVO, idx: number): ArticleItem {
  return {
    id: String(vo.id),
    title: vo.title,
    cat: vo.categoryName || "动画评论",
    cover: COVER_COLORS[idx % COVER_COLORS.length],
    summary: vo.summary || "",
    author: vo.author || "匿名",
    authorColor: AUTHOR_COLORS[idx % AUTHOR_COLORS.length],
    date: (vo.createTime || "").slice(0, 10),
  };
}

export default function Article() {
  const [activeCat, setActiveCat] = useState<string>("全部");
  const [searchVal, setSearchVal] = useState<string>("");
  const [articles, setArticles] = useState<ArticleItem[]>(
    LOCAL_ARTICLES.map((a, i) => ({ ...a, id: `local-${i}` })),
  );
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  // 从后端加载文章列表
  const loadArticles = useCallback(async (page: number, keyword?: string) => {
    setLoading(true);
    try {
      const res = await getArticleListApi({
        pageNum: page,
        pageSize,
        keyword: keyword || undefined,
        status: 1, // 只查已发布
      });
      if (res?.list && res.list.length > 0) {
        setArticles(res.list.map((vo, i) => adaptArticle(vo, i)));
        setTotal(res.total ?? 0);
      }
    } catch {
      // 后端不可用，保持本地数据
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => loadArticles(1));
  }, [loadArticles]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadArticles(page, searchVal);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadArticles(1, searchVal);
  };

  const filteredArticles = useMemo(() => {
    if (activeCat === "全部") return articles;
    return articles.filter((item) => item.cat === activeCat);
  }, [activeCat, articles]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="article-page">
      <RevealOnScroll variant="up">
        <header className="article-header">
          <h1 className="article-title">📖 文章专栏</h1>
          <p className="article-subtitle">ACG 文化深度解读，第一手原创资讯</p>
        </header>
      </RevealOnScroll>

      <RevealOnScroll variant="up" delay={1}>
        <div className="glass-card article-toolbar">
          <div className="article-search">
            <SearchOutlined className="article-search-icon" />
            <input
              type="text"
              className="article-search-input"
              placeholder="搜索文章标题、作者..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />
          </div>

          <div className="article-chips">
            {ARTICLE_CATS.map((cat) => (
              <button
                key={cat}
                className={`article-chip ${activeCat === cat ? "active" : ""}`}
                onClick={() => setActiveCat(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </RevealOnScroll>

      <div key={activeCat} className="article-list-fade">
        {loading && (
          <div className="article-empty">
            <p>正在加载文章...</p>
          </div>
        )}
        <div className="article-list">
          {filteredArticles.map((article, idx) => {
            const staggerDelay = (idx % 2) + 1;
            return (
              <RevealOnScroll
                key={article.id}
                variant="up"
                delay={staggerDelay}
              >
                <article className="glass-card article-card">
                  <div
                    className="article-card-cover"
                    style={{
                      background: `linear-gradient(135deg, ${article.cover[0]} 0%, ${article.cover[1]} 100%)`,
                    }}
                  >
                    <div className="article-card-cover-inner" />
                  </div>

                  <div className="article-card-body">
                    <span className="article-card-tag">{article.cat}</span>
                    <h2 className="article-card-title">{article.title}</h2>
                    <p className="article-card-summary">{article.summary}</p>

                    <div className="article-card-meta">
                      <div className="article-card-author">
                        <span
                          className="article-card-author-avatar"
                          style={{
                            background: `linear-gradient(135deg, ${article.authorColor[0]} 0%, ${article.authorColor[1]} 100%)`,
                          }}
                        >
                          <UserOutlined />
                        </span>
                        <span className="article-card-author-name">
                          {article.author}
                        </span>
                      </div>
                      <div className="article-card-divider" />
                      <div className="article-card-date">
                        <ClockCircleOutlined />
                        <span>{article.date}</span>
                      </div>
                      <div className="article-card-readmore">
                        阅读全文 <span className="article-card-arrow">→</span>
                      </div>
                    </div>
                  </div>
                </article>
              </RevealOnScroll>
            );
          })}
        </div>

        {!loading && filteredArticles.length === 0 && (
          <div className="article-empty">
            <p>暂无相关文章</p>
          </div>
        )}
      </div>

      <RevealOnScroll variant="up">
        <div className="article-pagination">
          <button
            className="article-page-btn article-page-nav"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            <LeftOutlined />
            <span>上一页</span>
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                className={`article-page-btn ${p === currentPage ? "active" : ""}`}
                onClick={() => handlePageChange(p)}
              >
                {p}
              </button>
            );
          })}
          <button
            className="article-page-btn article-page-nav"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            <span>下一页</span>
            <RightOutlined />
          </button>
        </div>
      </RevealOnScroll>
    </div>
  );
}
