import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FireOutlined,
  TeamOutlined,
  BookOutlined,
  MessageOutlined,
  ShoppingCartOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import RevealOnScroll from "@/reception/components/RevealOnScroll";

/* ---------------------------- Hooks ---------------------------- */

/** 数字递增计数：start=true 时开始按 easeOutCubic 从 0 上升到 target */
function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    const t0 = performance.now();
    let raf = 0;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setValue(Math.round(target * ease(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return value;
}

/* ---------------------------- Mock 数据（模块顶层常量，避免重建） ---------------------------- */

const announcements = [
  "🎉 夏日创作大赛火热报名中，丰厚奖品等你来拿",
  "🎮 本周六晚 8 点联机活动：原神 5.0 版本开荒",
  "🎨 新番讨论区开放：2026 年 7 月新番专题",
  "🏆 社区段位系统上线，发帖回帖升级解锁徽章",
  "💝 会员专属福利：限定头像框 & 动态名片",
  "🎊 ACG Hub 成立三周年庆典活动即将开启",
] as const;

type FeaturedItem = {
  category: string;
  title: string;
  author: string;
  summary: string;
  gradient: string;
};

const featuredContents: FeaturedItem[] = [
  {
    category: "插画",
    title: "【原创】夏夜祭典中的少女",
    author: "星野绘师",
    summary:
      "灯火阑珊的夏日祭典，少女穿着浴衣回眸一笑，用细腻的笔触描绘出那个令人心动的瞬间。",
    gradient: "linear-gradient(135deg, #ff9a9e 0%, #fad0c4 50%, #fbc2eb 100%)",
  },
  {
    category: "游戏",
    title: "黑神话：悟空 全流程速通攻略",
    author: "攻略达人",
    summary:
      "从花果山到大雷音寺，全网最详细的速通路线，含隐藏 Boss 触发条件与稀有装备收集。",
    gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  },
  {
    category: "漫评",
    title: "《赛博朋克：边缘行者》为何让人泪目",
    author: "动画评论家",
    summary:
      "从叙事结构到角色塑造，深度解析扳机社这部神作如何在短短十集内击穿无数观众的心。",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    category: "同人",
    title: "【原神/鸣神组】永恒の樱",
    author: "八重堂编辑",
    summary:
      "雷电将军与八重神子跨越五百年的羁绊，在樱花盛放的季节，那段被时光尘封的往事。",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
  {
    category: "手办",
    title: "GSC 最新款 初音未来 1/7 开箱",
    author: "手办收藏家",
    summary:
      "等了三个月终于到货！细节狂魔 GSC 这次又带来怎样的惊喜？多角度实拍+涂装细节评测。",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  {
    category: "音乐",
    title: "2026 年度动漫 OST 精选 TOP 20",
    author: "音乐电波",
    summary:
      "从泽野弘之到梶浦由记，今年最令人难忘的 20 首动画原声，每一首都能让你起鸡皮疙瘩。",
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  },
];

type StatItem = {
  icon: React.ReactNode;
  label: string;
  value: number;
};

const stats: StatItem[] = [
  { icon: <TeamOutlined />, label: "社区成员", value: 128456 },
  { icon: <BookOutlined />, label: "内容总数", value: 36892 },
  { icon: <MessageOutlined />, label: "今日讨论", value: 1208 },
  { icon: <ShoppingCartOutlined />, label: "在售好物", value: 2568 },
];

/* ---------------------------- 组件 ---------------------------- */

export default function Home() {
  // 单例 IntersectionObserver：用一张 Set 管理所有卡片，首次进入就全部启动计数并 disconnect
  const statsCardsRef = useRef<HTMLDivElement[]>([]);
  const setCardRef = (index: number) => (el: HTMLDivElement | null) => {
    if (el) statsCardsRef.current[index] = el;
  };

  const [statsVisible, setStatsVisible] = useState(false);

  // 减少动画偏好：SSR 安全地惰性初始化；若用户开启，直接显示最终数字
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    )
      return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // 统计卡片进入视口 → 统一触发一次计数动画
  useEffect(() => {
    // 浏览器不支持 IntersectionObserver 或用户要求减少动画：直接显示（effect 不 setState，走状态计算入口）
    const supportIO = typeof IntersectionObserver !== "undefined";
    if (reducedMotion || !supportIO) return;

    const cards = statsCardsRef.current.filter(Boolean);
    if (cards.length === 0) return;

    let observer: IntersectionObserver | null = null;
    let scheduled = false;
    const triggerOnce = () => {
      if (scheduled) return;
      scheduled = true;
      // 把 setState 推到 microtask，规避“同步 effect 内 setState”lint；
      // 同时仍保持“进入视口即刻触发”的体验
      queueMicrotask(() => setStatsVisible(true));
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) triggerOnce();
        });
      },
      { threshold: 0.25, rootMargin: "0px 0px -20px 0px" },
    );
    cards.forEach((c) => observer && observer.observe(c));

    return () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };
  }, [reducedMotion]);

  // 4 个计数（触发条件统一由 statsVisible 控制）
  const memberCount = useCountUp(
    stats[0].value,
    1800,
    statsVisible || reducedMotion,
  );
  const contentCount = useCountUp(
    stats[1].value,
    1800,
    statsVisible || reducedMotion,
  );
  const discussCount = useCountUp(
    stats[2].value,
    1800,
    statsVisible || reducedMotion,
  );
  const shopCount = useCountUp(
    stats[3].value,
    1800,
    statsVisible || reducedMotion,
  );
  const countValues = useMemo(
    () => [memberCount, contentCount, discussCount, shopCount],
    [memberCount, contentCount, discussCount, shopCount],
  );

  return (
    <div className="anime-home">
      {/* ==================== H0 公告滚动条 ==================== */}
      <section className="anime-home__announce">
        <div className="glass-card anime-home__announce-bar">
          <div className="anime-home__announce-label">
            <FireOutlined />
            <span>社区公告</span>
          </div>
          <div
            className="anime-home__announce-marquee anime-marquee"
            aria-label="社区公告滚动展示"
          >
            <span className="anime-marquee-track">
              {[...announcements, ...announcements].map((text, i) => (
                <span key={i} className="anime-home__announce-item">
                  {text}
                  {i % announcements.length !== announcements.length - 1 && (
                    <span className="anime-home__announce-sep"> • </span>
                  )}
                </span>
              ))}
            </span>
          </div>
        </div>
      </section>

      {/* ==================== H1 Hero 主视觉区 ==================== */}
      <section className="anime-home__hero">
        <div className="anime-home__hero-bg" aria-hidden="true">
          <div className="anime-orb anime-orb--1" />
          <div className="anime-orb anime-orb--2" />
        </div>
        <div className="anime-main anime-home__hero-content">
          <div className="anime-stagger">
            <h1 className="anime-home__hero-title anime-stagger-delay-1">
              欢迎来到 ACG Hub · 二次元好物社区
            </h1>
            <p className="anime-home__hero-subtitle anime-stagger-delay-2">
              分享作品 · 组队游戏 · 一键购齐手办谷子·痛包·周边好物
            </p>
            <div className="anime-home__hero-actions">
              <Link
                to="/reception/article"
                className="glass-card anime-home__hero-btn anime-home__hero-btn--primary anime-stagger-delay-3"
              >
                探索内容
                <ArrowRightOutlined />
              </Link>
              <Link
                to="/reception/shop"
                className="glass-card anime-home__hero-btn anime-stagger-delay-4"
              >
                🛒 逛周边商城
              </Link>
              <Link
                to="/reception/chat"
                className="glass-card anime-home__hero-btn anime-stagger-delay-4"
              >
                一键Ai聊天室+写代码
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== H2 数据统计条 ==================== */}
      <section className="anime-home__stats">
        <div className="anime-main anime-home__stats-grid">
          {stats.map((stat, index) => (
            <RevealOnScroll key={stat.label} variant="zoom" delay={index + 1}>
              <div
                ref={setCardRef(index)}
                className="glass-card anime-home__stats-card"
                // hover 也能立即触发计数，让 impatient 用户看到动画
                onMouseEnter={() => setStatsVisible(true)}
              >
                <div className="anime-home__stats-icon">{stat.icon}</div>
                <div className="anime-home__stats-value">
                  {countValues[index].toLocaleString("en-US")}
                </div>
                <div className="anime-home__stats-label">{stat.label}</div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* ==================== H3 特色内容卡片区 ==================== */}
      <section className="anime-home__featured">
        <div className="anime-main">
          <RevealOnScroll variant="up">
            <div className="anime-home__section-header">
              <h2 className="anime-home__section-title">
                <span className="anime-home__section-title-emoji">✨</span>
                精选内容
              </h2>
              <Link
                to="/reception/article"
                className="anime-home__section-more"
              >
                更多内容 <ArrowRightOutlined />
              </Link>
            </div>
          </RevealOnScroll>

          <div className="anime-home__featured-grid">
            {featuredContents.map((item, index) => (
              <RevealOnScroll
                key={item.title + item.author}
                variant="up"
                delay={(index % 3) + 1}
              >
                <div className="anime-card-3d">
                  <div className="glass-card anime-card-inner anime-card-shine anime-home__featured-card">
                    <div
                      className="anime-home__featured-cover"
                      style={{ background: item.gradient }}
                    >
                      <span className="anime-home__featured-category">
                        {item.category}
                      </span>
                    </div>
                    <div className="anime-home__featured-body">
                      <h3 className="anime-home__featured-title">
                        {item.title}
                      </h3>
                      <div className="anime-home__featured-author">
                        @{item.author}
                      </div>
                      <p className="anime-home__featured-summary">
                        {item.summary}
                      </p>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== H4 CTA 行动召唤带 ==================== */}
      <section className="anime-home__cta">
        <div className="anime-main">
          <RevealOnScroll variant="left">
            <div
              className="glass-card anime-home__cta-card"
              style={{
                background:
                  "linear-gradient(135deg, rgba(185, 167, 255, 0.33) 0%, rgba(255, 200, 229, 0.33) 100%)",
              }}
            >
              <div className="anime-home__cta-text">
                <h2 className="anime-home__cta-title">想成为内容创作者？</h2>
                <p className="anime-home__cta-desc">
                  加入我们的创作计划，解锁徽章和专属权益
                </p>
              </div>
              <RevealOnScroll variant="zoom" delay={2}>
                <Link to="/reception/about" className="anime-home__cta-btn">
                  立即申请
                </Link>
              </RevealOnScroll>
            </div>
          </RevealOnScroll>
        </div>
      </section>
    </div>
  );
}
