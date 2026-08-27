// 前台 ACG 周边商城购物车 Zustand store
// 本地状态优先（即时 UI 响应），后端同步异步执行（登录后自动拉取/同步）
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  addCartApi,
  getCartListApi,
  updateCartQtyApi,
  deleteCartApi,
  clearCartApi,
} from "@/services/portal";
import type { CartItemVO, CartState } from "@/types/api";
import type { CartItem } from "@/types";

/** 后端 CartItemVO → 前端 CartItem 适配 */
function adaptCartItem(vo: CartItemVO): CartItem {
  return {
    id: String(vo.productId),
    name: vo.productName,
    category: "周边谷子", // 后端无对应字段，用默认值
    price: vo.price || 0,
    originalPrice: vo.price || 0,
    stock: 999, // 后端 CartItemVO 不含 stock，给一个大值避免 UI 限制
    sales: 0,
    rating: 5,
    coverGradient: vo.productPic
      ? `url(${vo.productPic})`
      : "linear-gradient(135deg, #667eea, #764ba2)",
    tags: [],
    description: vo.productSubTitle ?? "",
    qty: vo.quantity,
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      add: (product, qty = 1) => {
        const want = Math.max(1, Math.floor(qty));
        const current = get().items.find((i) => i.id === product.id);
        const existingQty = current?.qty ?? 0;
        const finalQty = Math.min(
          existingQty + want,
          Math.max(1, product.stock),
        );
        const actuallyAdded = finalQty - existingQty;
        if (actuallyAdded <= 0) return 0;

        if (current) {
          set({
            items: get().items.map((i) =>
              i.id === product.id ? { ...i, qty: finalQty } : i,
            ),
          });
        } else {
          set({
            items: [
              ...get().items,
              { ...product, qty: actuallyAdded } satisfies CartItem,
            ],
          });
        }

        // 异步同步到后端（静默失败，本地状态已更新）
        addCartApi({
          productId: Number(product.id) || 0,
          quantity: actuallyAdded,
        }).catch(() => {});

        return actuallyAdded;
      },

      remove: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
        const numericId = Number(id);
        if (numericId > 0) {
          deleteCartApi([numericId]).catch(() => {});
        }
      },

      updateQty: (id, qty) => {
        const safeQty = Math.floor(qty);
        if (safeQty <= 0) {
          set({ items: get().items.filter((i) => i.id !== id) });
          const numericId = Number(id);
          if (numericId > 0) deleteCartApi([numericId]).catch(() => {});
          return;
        }
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, qty: Math.min(safeQty, i.stock) } : i,
          ),
        });
        // 后端需要 cartItemId（非 productId），此处用 productId 近似
        const numericId = Number(id);
        if (numericId > 0) {
          updateCartQtyApi(numericId, safeQty).catch(() => {});
        }
      },

      clear: () => {
        set({ items: [] });
        clearCartApi().catch(() => {});
      },

      totalCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),

      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.qty * i.price, 0),

      /** 从后端拉取购物车列表，合并到本地 */
      syncFromServer: async () => {
        try {
          const list = await getCartListApi();
          if (Array.isArray(list)) {
            set({ items: list.map(adaptCartItem) });
          }
        } catch {
          // 后端不可用时保持本地状态
        }
      },
    }),
    {
      name: "acg_cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);

export default useCartStore;
