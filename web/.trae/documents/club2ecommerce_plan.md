# 俱乐部改电商 + 打包优化 实现方案

## Repository Research

### 一、当前「俱乐部」模块现状（需改造点一览）
| 位置 | 内容 | 改后方案 |
|---|---|---|
| `src/reception/pages/Club/Club.tsx` | 俱乐部广场页：`CATEGORIES`（动画/漫画/游戏/小说/音乐/绘画/手办）、`CLUB_DATA`（9 条俱乐部）、分类 pill 筛选、3 列卡片网格、卡片底部"加入"按钮 | 改成 ACG 周边电商商品页：分类改为商品分类，Mock 数据改为商品（带价格/原价/库存/销量/评分/标签），卡片底部按钮改为"加入购物车"并显示价格，增加购物车徽标与简单购物车抽屉（纯前端状态） |
| `src/reception/pages/Club/Club.css` | `.club-page / .club-card* / .club-cat-pill / .club-card-join-btn` 等命名 | 同步改为 `.shop-*` 前缀（页面容器、卡片、分类、价格区、按钮、购物车抽屉），保留玻璃拟态 + 粉紫蓝配色 + 3D 动效 |
| `src/types/index.ts` | `interface Club { id,name,cover,description,members,category,tags }`（后台 Dashboard / mock 种子用） | **保留**（后台仍在用），**新增** `Product / CartItem / ShopCategory` 类型，互不影响 |
| `src/mock/data.ts` | `mockClubs: Club[]`（后台数据） | **保留**，新增 `mockProducts: Product[]` 作为电商商品种子 |
| `src/router/routes.tsx` | `path: "club" / lazyLoad(Club) / handle.title:"俱乐部"` | **路径保持不变 `/reception/club`（避免外链失效）**，仅 `handle.title` 改为「周边商城」，页面组件改为 Shop |
| `src/reception/index.tsx`（导航） | `{ to: "/reception/club", label: "俱乐部" }` | label 改为「周边商城」 |
| `src/reception/pages/Home.tsx` | CTA/Hero 链接「加入俱乐部」→ `/reception/club`；stats「活跃俱乐部」 | Hero 链接文字改「逛周边商城」；stats 标签改成「在售商品」，数值调整（保持视觉一致，文案替换即可，保留 `clubCount` 变量名影响不大）；About 页面历史时间线里"俱乐部系统上线"那一条若出现则一并改文案 |
| `dist/assets/Club-*.css/.js` | 产物文件名带 `Club` | 新的 lazy chunk 会由 Vite 根据组件路径自动命名为 `Shop-*`（因为导入路径改为 `Shop/Shop`） |

### 二、打包优化现状
- `vite.config.ts`：默认 build。仅有 React 插件与路径 alias，**未配置** `build.rollupOptions.manualChunks`、`build.chunkSizeWarningLimit`、`esbuild.drop`、`assetsInlineLimit`；未预构建；CSS 无代码分割的显式策略
- `tsconfig.app.json`：`target: es2023`（新浏览器，可放心 drop）；`verbatimModuleSyntax` 开启（要求 type-only import 显式写 `import type`，这点需要在改造代码时保持）
- 实测上次 build 总 gzip ~247KB，其中 `compact-item-SA-nc3W4.js`(antd 核心) 90.96 KB gzip、`tag-BYKhaRK4.js`(antd tag) 80.88 KB gzip — antd 没有按组件分拆，造成单 chunk 过大；各页面 lazy chunk 未与 React runtime/vendor 隔离
- `package.json` 只有 `build: tsc -b && vite build`，没有 `report`、`analyze` 脚本

## Files and Modules（修改/新增清单）

### 新增文件
- `src/reception/pages/Shop/Shop.tsx` — 商品页（分类筛选 + 3D 商品卡网格 + 价格 / 评分 / 销量 + 加购按钮 + 购物车抽屉）
- `src/reception/pages/Shop/Shop.css` — 电商页样式（沿用粉紫蓝配色）
- `src/store/cart.ts` — Zustand 轻量购物车 store（persist 到 localStorage，含 add / remove / updateQty / clear / totalCount / totalPrice）
- `rollup-plugin-visualizer` 未引入：通过 Vite 内置 `build.rollupOptions.output.manualChunks` 即可，不新增依赖（避免 lock 膨胀）

### 修改文件（按依赖顺序执行）
1. `src/types/index.ts` — 新增 `ShopCategory / Product / CartItem` 类型（type-only，不影响现有 Club）
2. `src/mock/data.ts` — 新增 `mockProducts: Product[]`（12+ 条 ACG 周边商品：手办 / 挂画 / 徽章 / 谷子 / 轻小说 / CD / 痛包 / 联名 T 恤等，保留原有 mockClubs 不变）
3. `vite.config.ts` — 打包优化：
   - `build.target = 'es2022'`（对齐 TS target，体积更小）
   - `build.minify = 'esbuild'` + `build.cssMinify = true`（默认，显式声明）
   - `build.assetsInlineLimit = 4096`（4KB 以下资源转 base64，减少请求）
   - `build.chunkSizeWarningLimit = 800`（当前最大 ~271KB，合理阈值）
   - `build.reportCompressedSize = true`（默认，显式）
   - `esbuild: { drop: ['console', 'debugger'] }`（生产移除 console/debugger，**`tsconfig` 有 `noUnusedLocals`，不要在开发依赖区用它影响本地调试 → 改为只在 production build 生效**。Vite 内置了 `mode === 'production'` 自动用 esbuild 压缩；更安全的做法是用 `defineConfig` 的函数式签名并判断 `mode`，生产才 `drop console`）
   - `build.rollupOptions.output.manualChunks`：按包拆分
     - `react-vendor`：`react` / `react-dom` / `react-router-dom` / `zustand`
     - `antd-vendor`：`antd` / `@ant-design/icons`
     - `app-common`：`src/router/*` / `src/store/*` / `src/services/*` / `src/utils/*` / `src/types/*` / `src/mock/*` / `src/reception/components/*`
     - 各页面 chunk 本来就是 lazy chunk，保留
4. `src/router/routes.tsx` — 第 26 行改 `lazyLoad(() => import("@/reception/pages/Shop/Shop"))`，handle.title 改为「周边商城」
5. `src/reception/index.tsx` — 第 11 行导航 label 改「周边商城」
6. `src/reception/pages/Home.tsx` — Hero 按钮「加入俱乐部」改「逛周边商城」、路径保持 `/reception/club`；stats 第 4 条「活跃俱乐部」改「在售商品」，value 从 256 改到例如 1286；CTA 里指向 creator 的保持不变
7. `src/reception/pages/About/About.tsx`（如有提及俱乐部上线文字，可选一并替换为"周边商城"）

### 不修改但需知晓
- `src/admin/pages/Dashboard.tsx` 可能引用了 `mockClubs` 或"俱乐部"统计：**保留不变**（后台统计的是另一套域模型）

## Implementation Steps（依赖有序）

**Phase A — 类型 & Mock（先跑通 TS 基础）**
1. `src/types/index.ts` 追加 3 个 type：`ShopCategory = '全部' \| '手办模型' \| '周边谷子' \| '服饰穿搭' \| '书籍漫画' \| '影音音乐' \| '数码数码'`；`Product = {id,name,category,price,originalPrice,stock,sales,rating,coverGradient:string,tags:string[],description}`；`CartItem = Product & { qty: number }`
2. `src/mock/data.ts` 追加 `mockProducts: Product[]`（12 条，每个分类至少 2 条，价格区间 ¥29-1299，覆盖原价折扣、库存/销量/评分、tags、coverGradient 沿用 Home.featured 的多套渐变风格）

**Phase B — 电商 Store & 组件**
3. 新建 `src/store/cart.ts`（Zustand + persist）：`{ items: CartItem[], add, remove, updateQty, clear, totalCount, totalPrice }`；persist key 用 `acg_cart`
4. 新建 `src/reception/pages/Shop/Shop.css`：沿用 `.club-*` 的视觉骨架但改为 `.shop-*`（`.shop-page / .shop-header / .shop-cats / .shop-grid / .shop-card* / .shop-price / .shop-add-btn / .shop-cart-fab / .shop-drawer`）
   - 新增：`.shop-price`（现价大字渐变 + 原价划线 + 折扣红色 badge）、`.shop-tag`、`.shop-rating`（星号 emoji + 评分 + 销量小字）
   - 新增：右下角 `.shop-cart-fab` 浮动购物车按钮（含数量徽标 bubble）；`.shop-drawer` 购物车抽屉（从右侧滑入、带毛玻璃背景、商品列表 + 加减 + 小计 + 结算按钮；空状态插画 + 文案）
5. 新建 `src/reception/pages/Shop/Shop.tsx`：完全基于 Club.tsx 的交互结构改造
   - 布局：Header → 分类 pills → 3D 卡片网格（分类切换 key 重新挂载触发 fade-in）
   - 卡片：封面渐变 + 分类胶囊 → 标题 → 标签 → 评分/销量 → 价格区（现价/原价/折扣）→ 库存小字 → "加入购物车" 按钮（hover 渐变色 + 加购成功后短暂变"已加入 ✓"）
   - 购物车：Fab 显示总数量；点击打开右侧抽屉；抽屉里可加/减/删除，显示总价和"立即结算"（未登录点击则跳转 `/login`，已登录则 AntD `message.success` + 清空购物车 — 没有真实后端就保留纯前端体验）

**Phase C — 路由 & 文案替换（全局一致性）**
6. `src/router/routes.tsx`：Club lazy import 改为 Shop 组件，title 改「周边商城」
7. `src/reception/index.tsx`：导航 label 改「周边商城」
8. `src/reception/pages/Home.tsx`：Hero「加入俱乐部」按钮 → 「逛周边商城」、stats「活跃俱乐部」→「在售商品」value 调整

**Phase D — 打包优化（无依赖，可并行，但最好放在最后验证）**
9. `vite.config.ts` 函数化签名 + 分条件的 production esbuild.drop + manualChunks 分块 + assetsInlineLimit 4KB：
   ```ts
   export default defineConfig(({ mode }) => {
     const isProd = mode === 'production'
     return {
       base: './',
       plugins: [react()],
       resolve: { alias: { '@': ... } },
       server: { port: 5173, open: false },
       esbuild: isProd ? { drop: ['console', 'debugger'] } : undefined,
       build: {
         target: 'es2022',
         cssMinify: true,
         assetsInlineLimit: 4096,
         chunkSizeWarningLimit: 800,
         reportCompressedSize: true,
         rollupOptions: {
           output: {
             manualChunks(id) {
               if (id.includes('node_modules')) {
                 if (/react|scheduler|react-router|zustand/.test(id)) return 'react-vendor'
                 if (/antd|@ant-design|rc-|@rc-component/.test(id)) return 'antd-vendor'
                 return 'vendor' // 其它第三方（目前无）
               }
               if (id.includes('/src/router/') ||
                   id.includes('/src/store/') ||
                   id.includes('/src/services/') ||
                   id.includes('/src/utils/') ||
                   id.includes('/src/types/') ||
                   id.includes('/src/mock/') ||
                   id.includes('/src/reception/components/')) return 'app-common'
             }
           }
         }
       }
     }
   })
   ```
10. `package.json` 增加一条脚本（不新增依赖）：`"build:analyze": "set BUILD_ANALYZE=1 && vite build"` 但 Vite 原生不支持 — 改为保守方案不加 analyze 脚本，仅通过 `manualChunks` + 肉眼对比产物大小即可；或保留不加脚本，仅改 vite.config

**Phase E — 验证**
11. `npm run lint` 确保全绿
12. `npm run build` 构建成功，并输出 chunk 结构：
    - `react-vendor.*.js`（~50KB gzip）
    - `antd-vendor.*.js`、`antd-vendor.*.css`（antd 合并为单包，不再碎片化 tag/compact-item 两大块）
    - `app-common.*.js`（router/store 通用）
    - 页面 chunk：Home / Shop / Article / About / ChatRoom / 后台各页 lazy chunk
13. 启动 dev server `npm run dev`，烟测：
    - 点击导航"周边商城" → 打开商品页、切换分类正常、hover 3D 动效、价格渐变、加购徽标、抽屉可关闭
    - 未登录时点"立即结算" → 跳 `/login`；登录后（admin/123456）点结算 → AntD message 成功反馈

## Dependencies and Considerations
- **路由路径兼容性**：`/reception/club` **URL 不变**，只改组件和标题；避免外部收藏/链接失效
- **Club 保留**：`types/index.ts` 的 `Club` 接口 + `mock/data.ts` 的 `mockClubs` **全部保留**，后台 Dashboard 仍在使用
- **Zustand cart store**：项目已使用 zustand persist，直接复用即可，无新依赖
- **`esbuild.drop` 仅限生产**：开发期保留 `console.log` 便于调试，只在 production build 时剥离
- **manualChunks 对 lazy chunk**：Router 的 `lazyLoad` 每个组件仍会生成独立 chunk（动态 import），manualChunks 只管静态依赖，不互相干扰
- **React 19 + antd 6**：版本较新，manualChunks 的模块路径字符串匹配（`/node_modules/antd/` 等）在 Vite 传给 Rollup 的绝对路径上能稳定命中
- **TS noUnusedLocals / noUnusedParameters / verbatimModuleSyntax**：新增 type 必须用 `export interface`；新增 import 必须加 `import type` 对类型
- **CSS 命名空间**：全部用 `.shop-*`，与 `.club-*` 不混；保留 `anime-card-3d / glass-card / anime-reveal*` 等通用类

## Validation
| 步骤 | 命令 / 操作 | 期望结果 |
|---|---|---|
| 类型 | `npx tsc -b`（或 build 自带） | 0 error |
| lint | `npm run lint` | 0 problem |
| build | `npm run build` | exit 0；产物里出现 `react-vendor-*.js` / `antd-vendor-*.js` / `app-common-*.js` 三块大的 vendor；Shop 独立 lazy chunk；总 gzip 下降或至少更均衡 |
| chunk 大小 | 手工看 dist/assets 列表 | 最大单 chunk gzip 控制在 < 120KB（antd-vendor 本来就大，合理），不再出现多个 80KB+ 的 antd 子模块碎片 |
| 功能烟测 | 打开 `/reception/club` → 改名为商品页 | 分类筛选、加购按钮、数量徽标、抽屉、购物车持久化（刷新还在）均正常 |
| 导航/跳转 | 首页 Hero "逛周边商城" / 导航 "周边商城" / CTA 跳转到商品页 / 加购后未登录结算跳登录 | 无 404 |

## Risks
| 风险 | 处理方式 |
|---|---|
| `esbuild.drop:['console']` 在开发期误启导致丢 log | 用 `defineConfig` 函数式签名，**只在 `mode==='production'` 才赋值 `esbuild.drop`** |
| manualChunks 路径匹配不稳（windows 反斜杠） | 统一用 `id.includes('node_modules')` + 关键词字符串，避免 path.sep 判断；Vite 传给 Rollup 的 id 通常是正斜杠 |
| `antd-vendor` 单块变大（原 80+80→合并 ~150KB gzip） | 正常 tradeoff：首屏只加载 react-vendor + app-common + Home chunk，antd 在后台页才会被拉；前台 Shop/Home/About 不需要完整 antd，仅用了 `@ant-design/icons`（会在 `antd-vendor` 中，但图标本身不大） |
| Cart 清空场景（登录过期、换账号） | 仅前端购物车就够：结算成功后 clear，或用户手动抽屉里清空 |
| Home.stats 文案修改时 `clubCount` 变量名看起来冲突 | 变量名不影响；只改 `label` 与 `value` 即可，也可一次性把 `clubCount` 重命名 `productsCount` 保证可读性（计划内包含此重命名） |
