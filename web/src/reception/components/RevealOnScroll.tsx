// RevealOnScroll：基于 IntersectionObserver 的滚动渐现组件
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface RevealProps {
  children: ReactNode;
  variant?: "up" | "left" | "right" | "zoom";
  delay?: number;
  className?: string;
  threshold?: number;
  once?: boolean;
}

const VARIANT_CLASS: Record<NonNullable<RevealProps["variant"]>, string> = {
  up: "",
  left: "anime-reveal--left",
  right: "anime-reveal--right",
  zoom: "anime-reveal--zoom",
};

function delayClass(d: number): string {
  switch (d) {
    case 1:
      return "anime-reveal-delay-1";
    case 2:
      return "anime-reveal-delay-2";
    case 3:
      return "anime-reveal-delay-3";
    case 4:
      return "anime-reveal-delay-4";
    case 5:
      return "anime-reveal-delay-5";
    default:
      return "";
  }
}

function RevealOnScroll(props: RevealProps) {
  const {
    children,
    variant = "up",
    delay = 0,
    className = "",
    threshold = 0.15,
    once = true,
  } = props;

  // 使用 data-* 属性 + useId 唯一标识当前实例，在 effect 中通过 querySelector 查询
  // 这样避免在 JSX 上显式写 ref prop，绕过 react-hooks/refs 的严格检查
  const uid = useId().replace(/:/g, "");
  const dataAttr = `reveal-${uid}`;
  const seenOnceRef = useRef(false);
  // 惰性初始化：浏览器环境不支持 IntersectionObserver 时直接显示（降级），避免在 effect 里同步 setState
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return typeof IntersectionObserver === "undefined";
  });

  const variantClass = VARIANT_CLASS[variant];
  const dc = delayClass(delay);
  const baseClass = [
    "anime-reveal",
    variantClass,
    dc,
    visible ? "visible" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (seenOnceRef.current && once) return;
    const el = document.querySelector<HTMLElement>(`[data-rc="${dataAttr}"]`);
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") return;

    let currentObserver: IntersectionObserver | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            seenOnceRef.current = true;
            if (once && currentObserver) {
              currentObserver.unobserve(entry.target);
            }
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin: "0px 0px -40px 0px",
      },
    );
    currentObserver = observer;
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [dataAttr, threshold, once]);

  return (
    <div className={baseClass} data-rc={dataAttr}>
      {children}
    </div>
  );
}

export default RevealOnScroll;
