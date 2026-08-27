# Electron 集成 Implementation Plan

## Repository Research
- 当前项目：React 19 + React Router 7 + Vite 8 + TypeScript 6 + Zustand，纯 Web SPA
- 现有配置：`base: './'`（已为 Electron file:// 加载准备相对路径）、`dist/` 产物、`index.html` 入口
- 包管理器：npm（存在 `package-lock.json`，无 `pnpm-lock.yaml`、无 `packageManager` 字段）
- TS 工程：`tsconfig.app.json`（渲染层 DOM） + `tsconfig.node.json`（仅覆盖 `vite.config.ts`，需加入 electron 构建配置与 preload/main 编译目标）
- 经验结论（From ExperienceRecall 833192 / 190318）：
  1. Windows + PowerShell 命令拼接用 `;` 而不是 `&&`；避免交互态残留污染终端
  2. Electron 下载慢/失败 → 使用 `ELECTRON_MIRROR` 镜像变量
  3. 全程使用同一包管理器（此项目 npm），避免 lockfile 错乱
  4. 依赖 engine 约束：Vite 8 + React 19 需 Node≥20；Electron 36+ / electron-vite 3.x / electron-builder 25+ 支持该区间

## Files and Modules
- `package.json`：
  - 新增 devDependencies：`electron`、`electron-vite`、`electron-builder`、`@types/node` 版本同步
  - 新增 scripts：`dev:electron` / `build:electron` / `preview:electron` / `pack` / `dist`
  - 新增字段：`main`（打包后入口）、`author`、`description`、`build`（electron-builder 配置）
- `electron.vite.config.ts`（新建）：electron-vite 三进程配置：main / preload / renderer，renderer 复用现有 `vite.config.ts` 的 alias、plugins、optimizations（manualChunks 等）
- `electron/main/index.ts`（新建）：BrowserWindow 创建、开发环境 loadURL（Vite dev server）、生产环境 loadFile（`../renderer/index.html`）、IPC 占位、窗口生命周期
- `electron/preload/index.ts`（新建）：contextBridge + IPC 安全暴露 API，最小化权限
- `tsconfig.node.json`（调整）：include 追加 electron-vite.config 与 electron/* 源文件；添加 electron 类型
- `index.html`（保留）：electron-vite renderer 默认读取该文件作为入口
- `.gitignore`（可选追加）：忽略 `out/`、`release/`、`dist-electron/` 产物目录

## Implementation Steps
1. **依赖安装**：`npm i -D electron@^36 electron-vite@^3 electron-builder@^25`（Windows 失败时追加 `$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'` 重试；单终端、非链式）
2. **TS 工程覆盖**：`tsconfig.node.json` include 加入 `electron.vite.config.ts` 和 `electron/**/*.ts`；`types` 追加 `electron`（若 electron 自带类型则不需要，但 electron-vite 推荐保持）
3. **主进程**：`electron/main/index.ts` 实现 `BrowserWindow` + webPreferences: `contextIsolation:true / nodeIntegration:false / sandbox:true / preload`；dev 模式 `process.env['ELECTRON_RENDERER_URL']` 读取 Vite URL，prod 加载 `file://../renderer/index.html`；`app.whenReady()` → createWindow；`window-all-closed` → `app.quit()`；`activate` → recreate
4. **预加载**：`electron/preload/index.ts` 用 `contextBridge.exposeInMainWorld('electronAPI', {...})` 暴露最小化 API（版本号、ping），`ipcRenderer.invoke/on` 预留，保持安全默认
5. **构建配置**：`electron.vite.config.ts` 定义 `main`、`preload`、`renderer`；renderer 使用 `@vitejs/plugin-react` + alias `@` + 生产环境 manualChunks（沿用当前 `vite.config.ts` 优化策略）；main / preload 指定 out 目录、target
6. **package.json 元数据**：补 `main` → `out/main/index.js`、`scripts`（dev:electron 调用 `electron-vite dev --watch`，build:electron → `electron-vite build`，pack → `electron-vite build && electron-builder --dir`，dist → `electron-vite build && electron-builder --win`）、`build` 段配置 files / asar / appId / productName / win 目标 nsis
7. **gitignore**：追加 `out/`、`release/`、`dist-electron/`
8. **启动验证**：
   - `npm run dev:electron` → 窗口弹出、控制台无异常（Console / DevTools），/reception 正常渲染、周边商城路由可跳转
   - `npm run build:electron` → `out/renderer/*` + `out/main/*` + `out/preload/*` 生成
   - （可选）`npm run pack` 生成 unpack 目录再双击 exe 打开验证

## Dependencies and Considerations
- **`electron-vite` vs 自管 Vite**：electron-vite 3.x 原生支持 Vite 8 + Rolldown；自动处理三进程 TS 编译、热更新、环境变量 `ELECTRON_RENDERER_URL`，避免手搓 IPC + watcher
- **Electron 下载链路**：首次 npm i electron 会从 GitHub release 拉 ~100MB zip，国内易失败；失败时用 `ELECTRON_MIRROR` + 临时环境变量重试（不写入全局用户环境）
- **NSIS 打包**：Windows 生成 `.exe` installer 需要本机有 NSIS 组件，electron-builder 会自下载；离线/失败可先只跑 `pack`（不生成安装器，生成 unpacked app）
- **asar 与文件协议路由**：Router 前端走 HashRouter 更安全，但当前已 base='./' 且使用 NavLink，Electron 中也能跑；如遇刷新空白再切 hash
- **Electron sandbox**：默认 sandbox:true，preload 中不能 require node 原生模块；如需 fs 应在主进程 + IPC 暴露

## Validation
- [X] `npm i -D electron electron-vite electron-builder` 成功（无 EBADENGINE / 无 postinstall 失败）
- [X] `npm run dev:electron` 窗口加载 `http://localhost:xxxx/` 正常，控制台无 ErrorBoundary NPE
- [X] `npm run lint` 依旧通过（新增 TS 文件无类型错误）
- [X] `npm run build:electron` 产物三目录齐全（renderer/main/preload），无编译错误
- [X] `npm run pack`（可选）生成 unpacked，exe 双击窗口加载 SPA

## Risks
1. **Electron 二进制下载慢** → 配置 ELECTRON_MIRROR 到 npmmirror；或先 `npm install` 小依赖，再单独 `npm i electron --force`
2. **Node / Electron / Vite 版本冲突** → 使用 node -v 检查是否 ≥20，否则提醒用户升级；本项目已有 vite@^8，需要 Node≥22.6 / ≥20.18（Vite 8 engine 要求）
3. **electron-vite 配置与原 vite.config 冲突** → renderer 部分尽量沿用原 vite.config 的字段，避免两套配置漂移
4. **PowerShell 链式命令失败** → 每个命令单独 RunCommand，避免 `&&`；命令失败立即切新 terminal
5. **NSIS 打包卡住** → 只验证 `pack` 生成 unpacked 目录即可；`dist` 留给用户需要安装器时手动再跑
