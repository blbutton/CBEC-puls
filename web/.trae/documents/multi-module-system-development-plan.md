# 多模块系统开发实施方案

> 范围：在 `d:\1\sb\1\web` 现有 React 19 + Vite 8 + TypeScript 6 + Ant Design 6 工程基础上，实现后台管理、二次元前台、SSO 登录注册、统一路由四大模块，并打包为 Electron 桌面应用。

---

## 一、概述

按依赖顺序一次性交付完整可用系统：

1. **基础设施**：依赖清理、共享类型/工具/状态管理/Mock 数据
2. **路由系统** `src/router`：react-router-dom v7 统一路由 + 守卫 + 懒加载
3. **SSO 登录注册** `src/LR`：登录/注册/找回密码 + 共享鉴权
4. **后台管理系统** `src/admin`：首页/用户/内容/监控/系统管理 5 子模块
5. **二次元前台** `src/reception`：首页/俱乐部/AI 聊天室/关于 4 页面
6. **Electron 桌面端**：主进程 + 预加载 + 构建打包
7. **测试**：Vitest + React Testing Library 关键用例
8. **验证**：构建/类型检查/响应式

---

## 二、当前状态分析

| 文件 | 现状 | 问题 |
|------|------|------|
| `package.json` | 已装 react 19.2 / antd 6.6 / vue-router 5.2 | 缺 react-router-dom、zustand、@ant-design/icons、electron、vitest；vue-router 与 React 不兼容 |
| `src/main.tsx` | `createRoot(...).render.apply(router).apply(antd)(...)` | **非法代码**，无法运行 |
| `src/App.tsx` | 渲染 3 个重复 id 的空 section | 无意义占位 |
| `src/router/index.ts` | 用 vue-router，引用不存在的 `HomeView.vue`/`AboutView.vue` | **无法编译** |
| `src/admin/index.tsx` `src/reception/index.tsx` `src/LR/index.tsx` | 各自重复调用 `createRoot` | **非法**，一个应用只能有一个 root |
| `src/LR/Login.tsx` `Register.tsx` | 空 `<div>` | 仅占位 |
| `src/assets/*.css` | 空文件 | 无样式 |
| `vite.config.ts` | 仅 react 插件 | 无路径别名、无 electron |

**结论**：现有源码基本为不可运行的空壳，需重写。保留工程脚手架（Vite/TS/ESLint 配置）与目录划分。

---

## 三、技术栈决策

| 维度 | 选型 | 理由 |
|------|------|------|
| UI 框架 | React 19（现有） | 已具备 |
| 路由 | **react-router-dom v7**（卸载 vue-router） | 用户确认；React 生态标准，原生支持守卫/动态路由/嵌套/参数 |
| UI 库 | Ant Design 6（现有）+ @ant-design/icons 6 | 后台管理规范 UI |
| 状态管理 | **Zustand v5**（+ persist 中间件） | 轻量、支持 React 19，承载鉴权/权限/用户态 |
| 桌面端 | **Electron** + vite-plugin-electron + electron-builder | 用户确认 Web+Electron |
| 动画 | 纯 CSS 动画 + SVG | 二次元动效（樱花粒子/渐变/玻璃拟态），避免 React 19 第三方动画库兼容风险 |
| 图表 | 自定义轻量 SVG 组件 | 避免 recharts 等库与 React 19 peer 冲突 |
| 测试 | Vitest + @testing-library/react + jest-dom | Vite 原生集成 |
| 数据 | Mock 数据 + localStorage 持久化 | 无后端 |

**不引入**：React Native（移动端独立工程，本次跳过）、framer-motion、recharts、redux。

---

## 四、目标目录结构

```
src/
├── main.tsx                      # 入口：RouterProvider
├── App.tsx                       # 根布局/Outlet 容器
├── assets/                       # 全局样式
│   ├── index.css
│   └── App.css
├── router/                       # 【模块4】统一路由
│   ├── index.tsx                 # createBrowserRouter + 路由表
│   ├── routes.tsx                # 路由配置（meta: auth/role/title）
│   ├── guards.tsx                # AuthGuard / RoleGuard / PublicOnlyGuard
│   └── lazy.tsx                  # React.lazy + Suspense 封装
├── LR/                           # 【模块3】SSO 登录注册
│   ├── index.tsx                 # AuthLayout（居中卡片+背景）
│   ├── Login.tsx                 # 登录（记住我/校验/显隐密码）
│   ├── Register.tsx              # 注册
│   └── ForgotPassword.tsx        # 找回密码
├── admin/                        # 【模块1】后台管理
│   ├── index.tsx                 # AdminLayout（侧边栏+顶栏+Outlet）
│   ├── pages/
│   │   ├── Dashboard.tsx         # 首页
│   │   ├── UserManagement.tsx    # 用户管理
│   │   ├── ContentManagement.tsx # 内容管理
│   │   ├── SystemMonitor.tsx     # 系统监控
│   │   └── SystemSettings.tsx    # 系统管理
│   ├── components/               # StatCard / PageHeader 等
│   └── menu.ts                   # 角色化菜单配置
├── reception/                    # 【模块2】二次元前台
│   ├── index.tsx                 # ReceptionLayout（顶导+背景）
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Club.tsx
│   │   ├── ChatRoom.tsx
│   │   └── About.tsx
│   ├── components/               # SakuraParticles / AnimeCard
│   └── styles/                   # 二次元专用 CSS
├── store/
│   └── auth.ts                   # Zustand 鉴权 store（token/user/roles/permissions）
├── services/                     # Mock API
│   ├── auth.ts
│   ├── user.ts
│   ├── content.ts
│   └── monitor.ts
├── types/
│   └── index.ts                  # User/Role/Content/Metric 等类型
├── utils/
│   ├── storage.ts                # localStorage 封装
│   └── format.ts                 # 日期/数字格式化
└── mock/
    └── data.ts                   # 用户/内容/俱乐部/指标 mock 数据
electron/
├── main.ts                       # 主进程
└── preload.ts                    # 预加载脚本
```

---

## 五、实施步骤

### Phase A — 基础设施与依赖清理

**A1. 依赖变更**（`package.json`）
- 卸载：`vue-router`
- 安装生产依赖：`react-router-dom@^7`、`zustand@^5`、`@ant-design/icons@^6`
- 安装开发依赖：`electron`、`vite-plugin-electron`、`electron-builder`、`vitest`、`@testing-library/react`、`@testing-library/jest-dom`、`@testing-library/user-event`、`jsdom`
- 新增 scripts：`electron:dev`、`electron:build`、`test`、`test:run`

**A2. Vite 配置**（`vite.config.ts`）
- 添加路径别名 `@` → `src`
- 接入 `vite-plugin-electron`（主进程 + 预加载入口）
- base 设为相对路径 `./`（Electron file:// 加载需要）

**A3. TS 配置**（`tsconfig.app.json`）
- 添加 `@/*` 路径映射
- `types` 增加 `vitest/globals`、`@testing-library/jest-dom`

**A4. 共享基础设施**
- `src/types/index.ts`：定义 `User`、`Role`、`Permission`、`ContentItem`、`ServerMetric`、`Club`、`ChatMessage`、`RouteMeta`
- `src/utils/storage.ts`：`getStorage`/`setStorage`/`removeStorage` 泛型封装（try/catch）
- `src/utils/format.ts`：日期、数字、文件大小格式化
- `src/store/auth.ts`：Zustand store
  ```ts
  interface AuthState {
    token: string | null
    user: User | null
    roles: string[]
    permissions: string[]
    rememberMe: boolean
    login: (username, password, remember) => Promise<LoginResult>
    register: (form) => Promise<RegisterResult>
    logout: () => void
    isAuthenticated: () => boolean
    hasRole: (role: string) => boolean
    hasPermission: (perm: string) => boolean
  }
  // persist: token + user + roles（rememberMe 控制持久化策略）
  ```
- `src/mock/data.ts`：mock 用户表（含 admin/user 角色）、内容列表、俱乐部列表、服务器指标生成器
- `src/services/*.ts`：封装模拟异步 API（setTimeout 模拟网络延迟，返回 Promise）

---

### Phase B — 路由系统（`src/router`）

**B1. `src/router/lazy.tsx`**
- `lazyLoad(factory, fallback?)`：封装 `React.lazy` + `<Suspense fallback={<Spin/>}>`
- 统一 fallback 为 AntD `Spin` 全屏加载

**B2. `src/router/guards.tsx`**
- `RequireAuth`：未登录 → `<Navigate to="/login" state={{ from }} />`
- `RequireRole`：无对应角色 → 重定向 403 或 `/reception`
- `RedirectIfAuthed`：已登录访问 `/login` 等 → 重定向 `/admin`
- 读取 `useAuthStore` 判断状态

**B3. `src/router/routes.tsx`** — 路由表（带 meta）

| 路径 | 组件 | 守卫 | 说明 |
|------|------|------|------|
| `/` | — | — | 重定向至 `/reception`（未登录）或 `/admin`（admin 登录） |
| `/login` | Login | RedirectIfAuthed | 登录 |
| `/register` | Register | RedirectIfAuthed | 注册 |
| `/forgot-password` | ForgotPassword | — | 找回密码 |
| `/reception` | ReceptionLayout | — | 前台壳 |
| `/reception` (index) | Home | | 首页 |
| `/reception/club` | Club | | 俱乐部 |
| `/reception/chat` | ChatRoom | | AI 聊天室 |
| `/reception/about` | About | | 关于 |
| `/admin` | AdminLayout | RequireAuth + RequireRole('admin') | 后台壳 |
| `/admin` (index) | Dashboard | | 首页 |
| `/admin/users` | UserManagement | | 用户管理 |
| `/admin/content` | ContentManagement | | 内容管理 |
| `/admin/monitor` | SystemMonitor | | 系统监控 |
| `/admin/settings` | SystemSettings | | 系统管理 |
| `*` | NotFound | | 404 |

- 动态路由：演示 `/admin/users/:id` 详情子路由（可选 modal 替代）
- 参数传递：`useParams` / `useSearchParams` / `useLocation().state`

**B4. `src/router/index.tsx`**
- 用 `createBrowserRouter` + `RouterProvider`，删除旧 `index.ts`（vue-router）
- ScrollToTop 组件：路由切换滚动到顶部

**B5. `src/main.tsx` 重写**
```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
```
- 删除非法的 `.render.apply(router).apply(antd)` 调用

**B6. `src/App.tsx` 重写**
- 作为根布局壳，包含全局 `<Outlet/>` 与全局错误边界、AntD `ConfigProvider`（中文/主题）、全局 Toast 容器

---

### Phase C — SSO 登录注册（`src/LR`）

**C1. `src/LR/index.tsx` — AuthLayout**
- 全屏二次元渐变背景 + 玻璃拟态登录卡片
- 居中布局，响应式（移动端单列）
- 内部 `<Outlet/>` 切换 login/register/forgot

**C2. `src/LR/Login.tsx`**
- AntD `Form`：用户名、密码（显隐切换）、记住我 Checkbox
- 表单校验规则（必填、长度）
- 调用 `authStore.login()`，成功后 `navigate(from || '/admin')`
- 链接：去注册 / 忘记密码
- SSO 集成：登录成功写入共享 token（localStorage `sso_token`），各模块通过 authStore 读取
- Mock 账号提示：`admin / 123456`（管理员）、`user / 123456`（普通用户）

**C3. `src/LR/Register.tsx`**
- 字段：用户名、邮箱、密码、确认密码、协议勾选
- 校验：邮箱格式、密码强度、两次密码一致、用户名唯一（查 mock）
- 注册成功写入 mock 用户表，跳转登录

**C4. `src/LR/ForgotPassword.tsx`**
- 三步流：输入邮箱 → 模拟发送验证码 → 重置密码
- AntD `Steps` 引导，验证码 mock 为固定 `1234`

---

### Phase D — 后台管理系统（`src/admin`）

**D1. `src/admin/index.tsx` — AdminLayout**
- AntD `Layout`：`Sider`（可折叠菜单）+ `Header`（用户头像/下拉/面包屑）+ `Content`（`<Outlet/>`）
- 菜单由 `src/admin/menu.ts` 配置，按 `authStore.roles` 过滤
- 顶栏：折叠按钮、面包屑（由路由 meta 生成）、用户下拉（退出登录）
- 响应式：Sider 在小屏自动收起为 Drawer

**D2. `src/admin/menu.ts`**
- 菜单树配置，每项含 `key`/`label`/`icon`/`path`/`roles`
- 角色化过滤函数 `filterMenuByRoles(menu, roles)`

**D3. `src/admin/pages/Dashboard.tsx` — 首页**
- 4 张 `StatCard`（用户数/内容数/今日访问/系统负载）
- 自定义 SVG 折线图（近 7 天访问）+ 柱状图（内容分类）
- 快捷操作入口

**D4. `src/admin/pages/UserManagement.tsx` — 用户管理**
- AntD `Table`：分页、排序、搜索（用户名/邮箱/状态筛选）
- 列：头像、用户名、邮箱、角色、状态、创建时间、操作
- 操作：新增（Modal 表单）、编辑、删除（Popconfirm）、启用/禁用
- CRUD 调用 `services/user.ts`（操作 mock 数据 + localStorage）
- 权限：仅 admin 角色可见删除按钮（`hasPermission`）

**D5. `src/admin/pages/ContentManagement.tsx` — 内容管理**
- `Table`：标题、分类、作者、状态（草稿/发布）、发布时间、操作
- 发布/编辑 Modal 表单（标题/分类/富文本简化为 TextArea/封面 URL/状态）
- 批量发布/删除（rowSelection）

**D6. `src/admin/pages/SystemMonitor.tsx` — 系统监控**
- 实时指标卡片：CPU/内存/磁盘/网络（setInterval 模拟刷新，自定义 SVG 仪表/折线）
- 操作日志 Table（mock 日志列表，支持级别筛选）
- 在线用户列表

**D7. `src/admin/pages/SystemSettings.tsx` — 系统管理**
- `Tabs`：角色权限 / 菜单管理 / 系统参数
  - 角色权限：角色列表 + 权限分配（Tree/Checkbox）
  - 菜单管理：菜单树展示
  - 系统参数：站点名/Logo/主题色等表单（AntD Form）
- 设置保存到 localStorage

**D8. 通用组件** `src/admin/components/`
- `StatCard`、`PageHeader`、`ChartCard`、`SearchBar`、`CrudModal`

---

### Phase E — 二次元前台（`src/reception`）

**E1. `src/reception/index.tsx` — ReceptionLayout**
- 顶部导航栏（玻璃拟态，logo + 菜单 + 登录入口）
- 全局二次元背景：渐变 + `SakuraParticles` 樱花飘落（CSS keyframes + 多个 span）
- `<Outlet/>` 内容区
- 页脚
- 响应式：移动端汉堡菜单

**E2. `src/reception/styles/anime.css`**
- 配色：粉/紫/蓝渐变、马卡龙色系
- 玻璃拟态 `.glass-card`、圆角、柔和阴影
- 动画：`float`、`fade-in-up`、`sakura-fall`、`pulse-glow`
- 字体：圆润字体栈

**E3. `src/reception/pages/Home.tsx` — 首页**
- Hero 区：大标题 + 副标题 + CTA 按钮 + 动漫插图占位（渐变 + CSS 角色立绘位）
- 特色内容卡片区（AnimeCard 网格，hover 浮起动效）
- 公告/活动滚动条
- 数据统计条

**E4. `src/reception/pages/Club.tsx` — 俱乐部**
- 俱乐部卡片网格（封面/名称/简介/成员数/标签）
- 分类筛选标签
- 点击进入详情（Modal 或子路由展示）
- 加入按钮（交互态）

**E5. `src/reception/pages/ChatRoom.tsx` — AI 聊天室**
- 聊天布局：消息列表 + 输入框 + 发送按钮
- 消息气泡（用户右侧/AI 左侧，二次元头像）
- Mock AI 回复（关键词匹配预设回复 + 打字机效果）
- 快捷话题按钮
- 自动滚动到底部

**E6. `src/reception/pages/About.tsx` — 关于**
- 项目介绍、技术栈展示、团队成员卡片、时间线
- 联系方式区域

**E7. 通用组件** `src/reception/components/`
- `SakuraParticles`、`AnimeCard`、`GradientButton`、`TypewriterText`

---

### Phase F — Electron 桌面端

**F1. `electron/main.ts`**
- 创建 `BrowserWindow`（1280x800，可调）
- 开发：`loadURL('http://localhost:5173')`；生产：`loadFile('dist/index.html')`
- 菜单栏自定义、窗口图标
- 生命周期管理（ready/window-all-closed/activate）

**F2. `electron/preload.ts`**
- 通过 `contextBridge` 暴露安全的桌面 API（如 `appInfo`、`windowMinimize` 等，按需）

**F3. Vite 集成**（`vite.config.ts`）
- `vite-plugin-electron` 配置 main/preload 入口
- 构建产物输出到 `dist-electron`

**F4. 打包配置**
- `package.json` 增加 `"main": "dist-electron/main.js"`
- `electron-builder` 配置（win nsis 安装包，appId、productName、icon）
- scripts：`electron:dev`（并发 vite + electron）、`electron:build`（vite build + electron-builder）

> **风险**：Vite 8 较新，`vite-plugin-electron` 可能尚未适配。若安装/构建报错，回退为手动方案：`vite build` 后用独立脚本 `electron .` 启动，main 进程直接 `loadFile`。

---

### Phase G — 测试

**G1. Vitest 配置**
- `vitest.config.ts`（或并入 vite.config）：环境 `jsdom`、setupFiles 引入 `@testing-library/jest-dom`、`@` 别名

**G2. 关键用例**（必要的单元 + 集成测试）
- `src/store/__tests__/auth.test.ts`：login 成功/失败、logout 清空、hasRole/hasPermission、rememberMe 持久化
- `src/router/__tests__/guards.test.tsx`：未登录被 RequireAuth 重定向、已登录访问 /login 被重定向、无角色被 RequireRole 拦截
- `src/LR/__tests__/Login.test.tsx`：表单校验（空提交报错）、正确凭据登录成功跳转
- `src/admin/__tests__/UserManagement.test.tsx`：表格渲染、搜索过滤、新增用户后列表更新

---

### Phase H — 验证与收尾

- `npm run lint` 通过
- `tsc -b` 类型检查通过
- `npm run build` 生产构建通过
- `npm run test:run` 测试通过
- 响应式自查：Chrome DevTools 切换 375/768/1280/1920 视口
- 路由守卫自查：未登录访问 /admin → 跳登录；user 角色访问 /admin → 拦截
- Electron 启动自查（`electron:dev`）

---

## 六、依赖变更汇总

**卸载**
- `vue-router`

**新增生产依赖**
- `react-router-dom@^7`
- `zustand@^5`
- `@ant-design/icons@^6`

**新增开发依赖**
- `electron`
- `vite-plugin-electron`
- `electron-builder`
- `vitest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- `jsdom`

**新增 scripts**
- `test`: `vitest`
- `test:run`: `vitest run`
- `electron:dev`: `vite`（通过插件自动拉起 electron）
- `electron:build`: `vite build && electron-builder`

---

## 七、假设与决策

1. **无真实后端**：所有数据为 mock + localStorage；`services/*.ts` 用 `setTimeout` 模拟网络延迟。SSO 体现为 SPA 内共享 token（localStorage `sso_token`），跨域 SSO 仅做模拟。
2. **角色体系**：`admin`（可进后台）、`user`（仅前台）。权限点细化为 `user:create` / `user:delete` / `content:publish` 等。
3. **Mock 账号**：`admin/123456`、`user/123456`，登录页提示。
4. **二次元风格不依赖 AntD**：reception 用纯 CSS，避免与后台 AntD 风格冲突；两套样式隔离（admin 用 AntD 前缀，reception 用 `.anime-*` 命名空间）。
5. **图表自研 SVG**：避免第三方图表库与 React 19 的 peer dependency 冲突。
6. **动画纯 CSS**：同上原因，不引入 framer-motion。
7. **路径别名**：`@` → `src`，全项目统一。
8. **不保留旧 vue-router 残留**：`src/router/index.ts` 删除，改为 `index.tsx`。
9. **Electron 为主进程+预加载最小实现**：不引入 IPC 重业务，仅暴露基础窗口信息。
10. **测试为"必要"覆盖**：聚焦鉴权/守卫/表单/核心 CRUD，不追求 100% 覆盖率。

---

## 八、风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| React 19.2 / Vite 8 / TS 6 / antd 6 均为极新版本，部分库 peer 不兼容 | 安装/构建失败 | 安装时验证；优先选已声明支持 React 19 的库；图表/动画自研规避 |
| `vite-plugin-electron` 未适配 Vite 8 | Electron 无法集成 | 回退手动方案（vite build + electron .） |
| antd v6 icons 包路径变化 | 图标无法引入 | 安装 @ant-design/icons@6 验证；必要时用 SVG 内联 |
| 工程体量大、文件多 | 实现周期长 | 严格按 Phase A→H 顺序，先跑通骨架再填内容 |
| Mock 数据与 localStorage 状态不同步 | CRUD 表现不一致 | services 层统一管理 localStorage 读写，单一数据源 |

---

## 九、验证步骤

1. `npm install` 安装新依赖，确认无 peer 冲突（必要时 `--legacy-peer-deps`）。
2. `npm run dev` 启动，访问 `/login`，用 `admin/123456` 登录 → 跳转 `/admin`。
3. 后台 5 个子模块逐一可达，表格 CRUD、表单校验、菜单折叠、响应式正常。
4. 退出登录后访问 `/admin` → 被重定向至 `/login`。
5. `/reception` 4 页面可达，二次元动画/样式正常，AI 聊天室可收发消息。
6. `user/123456` 登录后访问 `/admin` → 被角色守卫拦截。
7. `npm run test:run` 全部测试通过。
8. `npm run build` 构建成功，产物在 `dist/`。
9. `npm run electron:dev` 桌面窗口正常加载应用。
10. DevTools 多视口响应式自查通过。
