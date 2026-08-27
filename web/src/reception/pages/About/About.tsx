import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";

/* ---------- 计数滚动 Hook ---------- */
function useCountUp(
  target: number,
  duration = 1800,
  start = false,
  decimals = 0,
): string | number {
  const [value, setValue] = useState<string | number>(decimals > 0 ? 0 : 0);
  useEffect(() => {
    if (!start) return;
    const startTime = performance.now();
    const initial = 0;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = initial + (target - initial) * eased;
      if (decimals > 0) {
        setValue(current.toFixed(decimals));
      } else {
        setValue(Math.round(current));
      }
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start, decimals]);
  return value;
}

/* ---------- 简易 RevealOnScroll（因为另一个任务会建好，这里用 IntersectionObserver 临时实现） ---------- */
function RevealOnScroll({
  children,
  variant = "up",
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  variant?: "up" | "left" | "right" | "zoom";
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* 根据 variant 计算初始与结束样式 */
  const variantTransform: Record<string, string> = {
    up: "translateY(24px)",
    left: "translateX(-28px)",
    right: "translateX(28px)",
    zoom: "scale(0.92)",
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translate(0) scale(1)"
          : variantTransform[variant],
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ---------- 带逗号格式化数字 ---------- */
function formatNumber(n: number | string): string {
  const [int, dec] = String(n).split(".");
  const withComma = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec ? `${withComma}.${dec}` : withComma;
}

/* ---------- 主组件 ---------- */
export default function About() {
  /* 计数启动：当 Hero 区进入视口后触发（简单起见，挂载后 300ms 统一启动） */
  const [countStart, setCountStart] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setCountStart(true), 300);
    return () => clearTimeout(t);
  }, []);

  const countDays = useCountUp(1268, 2000, countStart, 0);
  const countUsers = useCountUp(128456, 2200, countStart, 0);
  const countPosts = useCountUp(92374, 2200, countStart, 0);
  const countSatisfaction = useCountUp(98.6, 2400, countStart, 1);

  /* 数据统计卡配置 */
  const STATS = [
    {
      icon: "🏆",
      label: "运营天数",
      value: formatNumber(countDays),
      suffix: " 天",
    },
    {
      icon: "👥",
      label: "累计注册",
      value: formatNumber(countUsers),
      suffix: " 人",
    },
    {
      icon: "📝",
      label: "社区贡献",
      value: formatNumber(countPosts),
      suffix: " 条",
    },
    {
      icon: "💖",
      label: "满意度",
      value: formatNumber(countSatisfaction),
      suffix: "%",
    },
  ];

  /* 技术栈配置 */
  const TECH_STACK = [
    { name: "React", color: "#61DAFB", letter: "R" },
    { name: "TypeScript", color: "#3178C6", letter: "TS" },
    { name: "Vite", color: "#646CFF", letter: "V" },
    { name: "Ant Design", color: "#1677FF", letter: "A" },
    { name: "Zustand", color: "#F59E0B", letter: "Z" },
    { name: "React Router", color: "#CA4245", letter: "RR" },
    { name: "Node.js", color: "#339933", letter: "N" },
    { name: "tRPC", color: "#398CCB", letter: "tR" },
    { name: "REST API", color: "#8B5CF6", letter: "RA" },
    { name: "LocalStorage", color: "#14B8A6", letter: "LS" },
    { name: "Figma", color: "#F24E1E", letter: "F" },
    { name: "CSS Animation", color: "#EC4899", letter: "CA" },
  ];

  /* 里程碑配置 */
  const MILESTONES = [
    {
      date: "2022.08",
      title: "ACG Hub 立项",
      desc: "首个 Demo 上线，最初的梦想从这里启程。",
    },
    {
      date: "2023.03",
      title: "注册用户破 1 万",
      desc: "俱乐部系统正式上线，社区氛围日益浓厚。",
    },
    {
      date: "2024.11",
      title: "AI 聊天功能上线",
      desc: "文章专栏大改版，内容质量再上新台阶。",
    },
    {
      date: "2026.08",
      title: "多端协同架构重构",
      desc: "开放创作者中心，让更多热爱被看见。",
    },
  ];

  /* 团队成员配置 */
  const TEAM = [
    {
      name: "Sakura",
      role: "项目发起",
      letter: "S",
      gradient: "linear-gradient(135deg, #c084fc, #e879f9)",
    },
    {
      name: "Miku",
      role: "前端架构",
      letter: "M",
      gradient: "linear-gradient(135deg, #22d3ee, #60a5fa)",
    },
    {
      name: "Rin",
      role: "设计 / 插画",
      letter: "R",
      gradient: "linear-gradient(135deg, #fb923c, #f472b6)",
    },
    {
      name: "Len",
      role: "社区运营",
      letter: "L",
      gradient: "linear-gradient(135deg, #34d399, #4ade80)",
    },
  ];

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
        {/* ============== 1. Hero 标题区 ============== */}
        <section style={{ textAlign: "center", padding: "24px 8px 8px" }}>
          <RevealOnScroll variant="up">
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(30px, 5vw, 48px)",
                fontWeight: 900,
                background:
                  "linear-gradient(90deg, #ff7eb3, #7a6bff 50%, #60a5fa)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: 1,
              }}
            >
              关于 ACG Hub
            </h1>
          </RevealOnScroll>
          <RevealOnScroll variant="up" delay={150}>
            <p
              style={{
                margin: "16px auto 0",
                maxWidth: 720,
                fontSize: "clamp(14px, 1.6vw, 17px)",
                lineHeight: 1.85,
                color: "#6a6a86",
              }}
            >
              我们是一群热爱 ACG
              的开发者与创作者，希望构建一个纯粹、温暖的二次元社区
            </p>
          </RevealOnScroll>
        </section>

        {/* ============== 2. 数据统计区 ============== */}
        <section>
          <RevealOnScroll variant="zoom">
            <h2 style={sectionTitleStyle}>📊 社区数据</h2>
          </RevealOnScroll>

          <div
            className="about-grid-stats"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 20,
              marginTop: 24,
            }}
          >
            {STATS.map((s, i) => (
              <RevealOnScroll key={s.label} variant="zoom" delay={i * 100}>
                <div
                  className="glass-card"
                  style={{
                    padding: "28px 20px 24px",
                    textAlign: "center",
                    transition: "transform 0.35s ease, box-shadow 0.35s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.boxShadow =
                      "0 20px 40px rgba(149, 128, 255, 0.22)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow =
                      "0 12px 36px rgba(149, 128, 255, 0.16)";
                  }}
                >
                  <div style={{ fontSize: 34, marginBottom: 10 }}>{s.icon}</div>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 900,
                      background: "linear-gradient(90deg, #ff7eb3, #7a6bff)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      lineHeight: 1.1,
                    }}
                  >
                    {s.value}
                    <span style={{ fontSize: 16, fontWeight: 700 }}>
                      {s.suffix}
                    </span>
                  </div>
                  <div style={{ marginTop: 8, color: "#7a7a9a", fontSize: 14 }}>
                    {s.label}
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </section>

        {/* ============== 3. 技术栈展示 ============== */}
        <section>
          <RevealOnScroll variant="up">
            <h2 style={sectionTitleStyle}>🛠 我们的技术栈</h2>
          </RevealOnScroll>

          <div
            className="about-grid-tech"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 18,
              marginTop: 24,
            }}
          >
            {TECH_STACK.map((t, i) => (
              <RevealOnScroll key={t.name} variant="up" delay={i * 60}>
                <div
                  className="glass-card"
                  style={{
                    padding: "22px 10px 18px",
                    textAlign: "center",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-5px)";
                    e.currentTarget.style.boxShadow =
                      "0 16px 32px rgba(149, 128, 255, 0.22)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow =
                      "0 12px 36px rgba(149, 128, 255, 0.16)";
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      margin: "0 auto 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: t.color,
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: t.letter.length > 1 ? 16 : 22,
                      boxShadow: `0 6px 16px ${t.color}55`,
                    }}
                  >
                    {t.letter}
                  </div>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "#4a4a66",
                    }}
                  >
                    {t.name}
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </section>

        {/* ============== 4. 发展时间轴 ============== */}
        <section>
          <RevealOnScroll variant="left">
            <h2 style={sectionTitleStyle}>📅 里程碑时间线</h2>
          </RevealOnScroll>

          <div className="anime-timeline" style={{ marginTop: 32 }}>
            {MILESTONES.map((m, i) => (
              <RevealOnScroll key={m.date} variant="left" delay={i * 140}>
                <div className="anime-timeline-item">
                  <span className="anime-timeline-dot" />
                  <div
                    className="glass-card"
                    style={{
                      padding: "20px 24px",
                      position: "relative",
                      transition: "transform 0.3s ease, box-shadow 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateX(6px)";
                      e.currentTarget.style.boxShadow =
                        "0 18px 36px rgba(149, 128, 255, 0.22)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "";
                      e.currentTarget.style.boxShadow =
                        "0 12px 36px rgba(149, 128, 255, 0.16)";
                    }}
                  >
                    <div
                      style={{
                        display: "inline-block",
                        padding: "3px 12px",
                        borderRadius: 999,
                        background:
                          "linear-gradient(135deg, #ff9ec733, #9a8bff33)",
                        color: "#5a4abf",
                        fontSize: 13,
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      {m.date}
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#3d3d58",
                        marginBottom: 6,
                      }}
                    >
                      {m.title}
                    </div>
                    <div
                      style={{
                        color: "#7a7a9a",
                        fontSize: 14,
                        lineHeight: 1.7,
                      }}
                    >
                      {m.desc}
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </section>

        {/* ============== 5. 团队成员卡片 ============== */}
        <section style={{ paddingBottom: 16 }}>
          <RevealOnScroll variant="up">
            <h2 style={sectionTitleStyle}>💜 核心团队</h2>
          </RevealOnScroll>

          <div
            className="about-grid-team"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 24,
              marginTop: 28,
            }}
          >
            {TEAM.map((member, i) => (
              <RevealOnScroll key={member.name} variant="up" delay={i * 120}>
                <div
                  className="glass-card"
                  style={{
                    padding: "28px 18px 22px",
                    textAlign: "center",
                    transition: "transform 0.35s ease, box-shadow 0.35s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow =
                      "0 20px 40px rgba(149, 128, 255, 0.25)";
                    const avatar = e.currentTarget.querySelector(
                      ".team-avatar",
                    ) as HTMLElement;
                    if (avatar) {
                      avatar.style.transform = "rotate(360deg)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow =
                      "0 12px 36px rgba(149, 128, 255, 0.16)";
                    const avatar = e.currentTarget.querySelector(
                      ".team-avatar",
                    ) as HTMLElement;
                    if (avatar) {
                      avatar.style.transform = "rotate(0deg)";
                    }
                  }}
                >
                  <div
                    className="team-avatar"
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: "50%",
                      margin: "0 auto 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: member.gradient,
                      color: "#fff",
                      fontSize: 38,
                      fontWeight: 900,
                      boxShadow: "0 10px 24px rgba(122, 107, 255, 0.3)",
                      transition: "transform 1s ease",
                    }}
                  >
                    {member.letter}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#3d3d58",
                      marginBottom: 4,
                    }}
                  >
                    {member.name}
                  </div>
                  <div style={{ fontSize: 13, color: "#7a7a9a" }}>
                    {member.role}
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

/* ---------- 公共：Section 标题样式 ---------- */
const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 800,
  color: "#3d3d58",
  textAlign: "center",
  letterSpacing: 0.5,
};
