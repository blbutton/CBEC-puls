import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import "./styles/anime.css";
import { Dropdown, Space, type MenuProps } from "antd";
import { DownOutlined } from "@ant-design/icons";

/** 主导航配置（集中声明，避免 render 期数组重建） */
const NAV = [
  { to: "/reception", label: "首页", end: true },
  { to: "/reception/shop", label: "周边商城", end: false },
  { to: "/reception/article", label: "文章", end: false },
  { to: "/reception/chat", label: "AI 聊天室", end: false },
  { to: "/reception/about", label: "关于", end: false },
] as const;

/* ---------------------------- 粒子系统类型 ---------------------------- */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
}

const PARTICLE_COLORS = [
  "rgba(255, 126, 179, 0.55)",
  "rgba(122, 107, 255, 0.55)",
  "rgba(100, 150, 255, 0.55)",
  "rgba(200, 140, 255, 0.45)",
  "rgba(255, 160, 200, 0.5)",
];

/** 根据视口尺寸与 DPR 计算合适的粒子数量与连线阈值 */
function getParticleBudget(width: number, dpr: number) {
  const base = width < 480 ? 28 : width < 900 ? 40 : 56;
  const count = dpr > 1.5 ? base + 8 : base;
  // 连线距离：小屏缩短连线半径，降低近邻对 (n²) 实际绘制量
  const maxDist = width < 480 ? 90 : 120;
  return { count, maxDist };
}

function initParticles(
  count: number,
  width: number,
  height: number,
): Particle[] {
  const list: Particle[] = [];
  for (let i = 0; i < count; i++) {
    list.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: 1.5 + Math.random() * 2.5,
      color:
        PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    });
  }
  return list;
}

/* ---------------------------- 主组件 ---------------------------- */

export function ReceptionLayout() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.roles.includes("admin"));
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const navRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const maxDistRef = useRef<number>(120);

  const [menuOpen, setMenuOpen] = useState(false);
  // 首次渲染直接读取 matchMedia（浏览器环境），避免 effect 内同步 setState
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    )
      return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  /* ---------- 导航栏滚动收缩：passive + 卸载清理 ---------- */
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const handleScroll = () => {
      nav.classList.toggle("anime-nav--scrolled", window.scrollY > 12);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ---------- 移动端菜单：窗口放大 / ESC / body 滚动锁 ---------- */
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 640) setMenuOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  // 菜单打开时锁定 body 滚动，避免后台内容随滚动
  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

  /* ---------- 减少动画偏好（SSR 安全：effect 只订阅 change，初始值由 useState 惰性初始化） ---------- */
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) =>
      setReducedMotion(e.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  /* ---------- 粒子 Canvas 动画：单 effect 内完成 resize + rAF + 清理 ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (reducedMotion) {
      canvas.style.display = "none";
      return;
    }
    canvas.style.display = "block";

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const maxDistSqRef = { current: 120 * 120 };

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const budget = getParticleBudget(w, dpr);
      maxDistRef.current = budget.maxDist;
      maxDistSqRef.current = budget.maxDist * budget.maxDist;
      particlesRef.current = initParticles(budget.count, w, h);
    };

    const step = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const particles = particlesRef.current;
      const maxDist = maxDistRef.current;
      const maxDistSq = maxDistSqRef.current;

      // 1. 位置更新 + 边界环绕（单 pass，避免重复遍历）
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = w + 20;
        else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        else if (p.y > h + 20) p.y = -20;
      }

      // 2. 连线：先比较平方避免开方，命中再按线性衰减透明度
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const alpha = 1 - dist / maxDist;
            ctx.strokeStyle = `rgba(149, 128, 255, ${alpha * 0.22})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // 3. 画粒子
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(step);
    };

    resize();
    window.addEventListener("resize", resize);
    rafRef.current = requestAnimationFrame(step);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [reducedMotion]);

  /* ---------- 菜单交互：避免 event 冒泡意外 ---------- */
  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  /* ---------- 退出登录 ---------- */
  const handleLogout = useCallback(() => {
    void logout();
    closeMenu();
    navigate("/login");
  }, [logout, navigate, closeMenu]);

  /* ---------- Auth 右侧区（登录 / 用户名 / 进入后台 / 退出） ---------- */
  const authRight = useMemo(() => {
    // 菜单项放到 useMemo 内部，避免外部每次重建导致依赖不稳定
    const menuItems: MenuProps["items"] = [
      {
        label: (
          <button
            type="button"
            className="anime-nav-action anime-nav-action--logout"
            onClick={handleLogout}
          >
            退出登录
          </button>
        ),
        key: "0",
      },
    ];

    if (token && isAdmin) {
      return (
        <>
          <Link
            to="/admin"
            className="anime-nav-action anime-nav-action--primary"
          >
            进入后台
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="anime-nav-action anime-nav-action--logout"
          >
            退出登录
          </button>
        </>
      );
    }
    if (token) {
      // token 已登录但 user 尚未就绪（刚刷新 / persist 还没写完）时兜底空字符串
      const displayName = user?.username ?? "";
      return (
        <>
          <Dropdown className="anime-nav-action" menu={{ items: menuItems }}>
            <a onClick={(e) => e.preventDefault()}>
              <Space>
                {displayName}
                <DownOutlined />
              </Space>
            </a>
          </Dropdown>
        </>
      );
    }
    return (
      <Link to="/login" className="anime-nav-action anime-nav-action--primary">
        登录
      </Link>
    );
    // 依赖用 user 而非 user.username：未登录时 user 为 null，直接读 user.username 会 NPE
  }, [token, isAdmin, user, handleLogout]);

  return (
    <div className="anime-layout">
      <div className="anime-bg" aria-hidden="true">
        <div className="anime-orb anime-orb--1" />
        <div className="anime-orb anime-orb--2" />
      </div>
      {!reducedMotion && (
        <canvas
          ref={canvasRef}
          className="anime-particles"
          aria-hidden="true"
        />
      )}

      <nav ref={navRef} className="anime-nav" aria-label="主导航">
        <Link
          to="/reception"
          onClick={closeMenu}
          className="anime-logo"
          aria-label="ACG Hub 首页"
        >
          ACG Hub
        </Link>

        <button
          type="button"
          className="anime-nav-toggle"
          aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
          aria-expanded={menuOpen}
          aria-controls="primary-nav-links"
          onClick={toggleMenu}
        >
          <span />
        </button>

        <div
          id="primary-nav-links"
          className="anime-nav-links"
          data-open={menuOpen ? "true" : "false"}
        >
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeMenu}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
          <div className="anime-nav-right">{authRight}</div>
        </div>

        {menuOpen && (
          <button
            type="button"
            aria-label="关闭菜单"
            onClick={closeMenu}
            className="anime-nav-mask"
          />
        )}
      </nav>

      <main className="anime-main">
        <Outlet />
      </main>

      <footer className="anime-footer">© 2026 ACG Hub · 二次元社区前台</footer>
    </div>
  );
}
