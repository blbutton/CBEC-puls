// ACG 周边商城页：分类筛选 + 商品卡片网格 + 3D 动效 + 购物车抽屉
import { useState, useMemo, useCallback, useEffect } from "react";
import RevealOnScroll from "@/reception/components/RevealOnScroll";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { searchProductsApi } from "@/services/portal";
import type { Product, ShopCategory } from "@/types";
import "./Shop.css";
import type { PortalProduct } from "@/types/api";

const CATEGORIES: ShopCategory[] = [
  "全部",
  "手办模型",
  "周边谷子",
  "服饰穿搭",
  "书籍漫画",
  "影音音乐",
  "数码数码",
];

function formatRating(r: number) {
  const full = Math.round(r);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function discountPct(product: Product) {
  if (!product.originalPrice) return 0;
  return Math.round((1 - product.price / product.originalPrice) * 100);
}

function starsText(r: number) {
  return `${r.toFixed(1)} · ${formatRating(r)}`;
}

/** 后端 PortalProduct → 前端 Product 适配 */
const GRADIENTS = [
  "linear-gradient(135deg, #667eea, #764ba2)",
  "linear-gradient(135deg, #f093fb, #f5576c)",
  "linear-gradient(135deg, #4facfe, #00f2fe)",
  "linear-gradient(135deg, #43e97b, #38f9d7)",
  "linear-gradient(135deg, #fa709a, #fee140)",
  "linear-gradient(135deg, #a8edea, #fed6e3)",
];

function adaptProduct(p: PortalProduct, idx: number): Product {
  return {
    id: String(p.id),
    name: p.name,
    category: "周边谷子",
    price: p.price ?? 0,
    originalPrice: p.originalPrice ?? p.price ?? 0,
    stock: p.stock ?? 100,
    sales: p.sale ?? 0,
    rating: 5,
    coverGradient: p.pic ? `url(${p.pic})` : GRADIENTS[idx % GRADIENTS.length],
    tags: p.brandName ? [p.brandName] : [],
    description: p.subTitle ?? p.description ?? "",
  };
}

export default function Shop() {
  const [activeCat, setActiveCat] = useState<ShopCategory>("全部");
  const [okIds, setOkIds] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    items,
    add,
    remove,
    updateQty,
    clear,
    totalCount,
    totalPrice,
    syncFromServer,
  } = useCartStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  // 登录后同步后端购物车
  useEffect(() => {
    if (isAuthenticated) {
      syncFromServer();
    }
  }, [isAuthenticated, syncFromServer]);

  // 从后端加载商品
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      setLoading(true);
      searchProductsApi({ pageNum: 1, pageSize: 50 })
        .then((page) => {
          if (cancelled) return;
          if (page?.list && page.list.length > 0) {
            setProducts(page.list.map((p, i) => adaptProduct(p, i)));
          }
        })
        .catch(() => {
          // 后端不可用，保持空列表，由空状态提示
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (activeCat === "全部") return products;
    return products.filter((p) => p.category === activeCat);
  }, [activeCat, products]);

  const cartCount = totalCount();
  const cartPrice = totalPrice();

  const handleAdd = useCallback(
    (product: Product) => {
      const added = add(product, 1);
      if (added <= 0) return;
      setOkIds((prev) => {
        const next = new Set(prev);
        next.add(product.id);
        window.setTimeout(() => {
          setOkIds((cur) => {
            const n = new Set(cur);
            n.delete(product.id);
            return n;
          });
        }, 1500);
        return next;
      });
    },
    [add],
  );

  useEffect(() => {
    if (typeof document === "undefined" || !drawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  const handleCheckout = () => {
    if (items.length === 0) return;
    alert(
      `模拟下单成功！共 ${cartCount} 件，合计 ¥${cartPrice.toLocaleString()}。\n` +
        "（真实下单将调用后端 /order/generateOrder）",
    );
    clear();
    setDrawerOpen(false);
  };

  return (
    <div className="shop-page">
      <RevealOnScroll variant="up">
        <header className="shop-header">
          <h1 className="shop-title">✨ 二次元好物 · 周边商城</h1>
          <p className="shop-subtitle">
            精选手办 · 谷子 · 痛包 · 音乐专辑，官方授权 & 限时限量
          </p>
        </header>
      </RevealOnScroll>

      <RevealOnScroll variant="up" delay={1}>
        <div className="shop-cats">
          <div className="shop-cats-inner">
            {CATEGORIES.map((cat, idx) => (
              <button
                key={cat}
                className={`shop-cat-pill ${activeCat === cat ? "active" : ""}`}
                onClick={() => setActiveCat(cat)}
                data-index={idx}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </RevealOnScroll>

      <div key={activeCat} className="shop-grid-fade">
        {loading && (
          <div className="shop-empty">
            <p>正在从后端加载商品...</p>
          </div>
        )}
        <div className="shop-grid">
          {filtered.map((product, idx) => {
            const stagger = (idx % 3) + 1;
            const discount = discountPct(product);
            const sold = product.stock <= 0;
            const isOk = okIds.has(product.id);
            return (
              <RevealOnScroll key={product.id} variant="up" delay={stagger}>
                <div className="anime-card-3d">
                  <article className="anime-card-inner glass-card shop-card">
                    <div
                      className="shop-card-cover"
                      style={{ background: product.coverGradient }}
                    >
                      <span className="shop-card-cat">{product.category}</span>
                      {discount > 0 && (
                        <span className="shop-card-discount">-{discount}%</span>
                      )}
                    </div>

                    <div className="shop-card-body">
                      <h3 className="shop-card-name">{product.name}</h3>

                      <div className="shop-card-tags">
                        {product.tags.map((t) => (
                          <span key={t} className="shop-tag">
                            #{t}
                          </span>
                        ))}
                      </div>

                      <div className="shop-rating">
                        <span className="shop-rating-stars">
                          {starsText(product.rating)}
                        </span>
                        <span>销量 {product.sales.toLocaleString()}</span>
                      </div>

                      <p className="shop-card-desc">{product.description}</p>

                      <div className="shop-price">
                        <span className="shop-price-now">
                          ¥{product.price.toLocaleString()}
                        </span>
                        {product.originalPrice > product.price && (
                          <span className="shop-price-old">
                            ¥{product.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="shop-stock">
                        {sold
                          ? "已售罄"
                          : product.stock < 20
                            ? `仅剩 ${product.stock} 件`
                            : `库存 ${product.stock} 件`}
                      </div>
                    </div>

                    <div className="shop-card-footer">
                      <button
                        type="button"
                        className={`shop-add-btn ${
                          isOk ? "shop-add-btn--ok" : ""
                        }`}
                        onClick={() => handleAdd(product)}
                        disabled={sold}
                      >
                        <span>
                          {sold
                            ? "已售罄"
                            : isOk
                              ? "✓ 已加入购物车"
                              : "🛒 加入购物车"}
                        </span>
                      </button>
                    </div>
                  </article>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>

        {!loading && filtered.length === 0 && (
          <div className="shop-empty">
            <p>该分类暂无商品，敬请期待更多上新 ✧</p>
          </div>
        )}
      </div>

      <button
        type="button"
        className="shop-cart-fab"
        aria-label="打开购物车"
        onClick={() => setDrawerOpen(true)}
      >
        🛒
        {cartCount > 0 && (
          <span className="shop-cart-fab-badge">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        )}
      </button>

      {drawerOpen && (
        <>
          <button
            type="button"
            aria-label="关闭购物车"
            className="shop-mask"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="shop-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="购物车"
          >
            <header className="shop-drawer-header">
              <h2 className="shop-drawer-title">
                🛍️ 购物车
                {cartCount > 0 && (
                  <span className="shop-rating">共 {cartCount} 件商品</span>
                )}
              </h2>
              <button
                type="button"
                className="shop-drawer-close"
                onClick={() => setDrawerOpen(false)}
                aria-label="关闭"
              >
                ✕
              </button>
            </header>

            {items.length === 0 ? (
              <div className="shop-drawer-empty">
                <div className="shop-drawer-empty-emoji">🛒</div>
                <div>
                  购物车空空如也 ~
                  <br />
                  先去挑几件心仪的周边吧！
                </div>
              </div>
            ) : (
              <div className="shop-drawer-list">
                {items.map((it) => (
                  <div key={it.id} className="shop-drawer-item">
                    <div
                      className="shop-drawer-thumb"
                      style={{ background: it.coverGradient }}
                    />
                    <div className="shop-drawer-info">
                      <h4 className="shop-drawer-name">{it.name}</h4>
                      <div className="shop-drawer-price">
                        ¥{it.price.toLocaleString()}
                      </div>
                      <div className="shop-drawer-qty">
                        <button
                          type="button"
                          className="shop-qty-btn"
                          onClick={() => updateQty(it.id, it.qty - 1)}
                          aria-label="减少"
                        >
                          −
                        </button>
                        <span className="shop-qty-num">{it.qty}</span>
                        <button
                          type="button"
                          className="shop-qty-btn"
                          onClick={() => updateQty(it.id, it.qty + 1)}
                          disabled={it.qty >= it.stock}
                          aria-label="增加"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="shop-drawer-remove"
                      onClick={() => remove(it.id)}
                      aria-label="删除"
                      title="删除商品"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}

            <footer className="shop-drawer-footer">
              <div className="shop-drawer-summary">
                <span className="shop-drawer-summary-label">
                  合计（不含运费）
                </span>
                <span className="shop-drawer-summary-value">
                  ¥{cartPrice.toLocaleString()}
                </span>
              </div>
              <div className="shop-drawer-actions">
                <button
                  type="button"
                  className="shop-drawer-clear"
                  onClick={clear}
                  disabled={items.length === 0}
                >
                  清空
                </button>
                <button
                  type="button"
                  className="shop-drawer-checkout"
                  onClick={handleCheckout}
                  disabled={items.length === 0}
                >
                  立即结算
                </button>
              </div>
            </footer>
          </aside>
        </>
      )}
    </div>
  );
}
