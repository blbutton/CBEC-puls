// Electron 主进程：BrowserWindow + 安全的 webPreferences + 最小 IPC
import { app, BrowserWindow, shell, ipcMain, Menu } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 是否生产构建：vite-plugin-electron 在 serve 时注入 VITE_DEV_SERVER_URL
process.env.APP_ROOT = path.join(__dirname, "../..");
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL as
  | string
  | undefined;

// 渲染层产物：dist/index.html（与 vite.config build.outDir 对应）
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

let win: BrowserWindow | null = null;

function createWindow() {
  // 安全默认：nodeIntegration=false + contextIsolation=true + sandbox
  const preload = path.join(MAIN_DIST, "preload.mjs");
  win = new BrowserWindow({
    title: "ACG Hub · 二次元好物社区",
    // 生产模式打包时，可在此设置 icon: path.join(__dirname, "icon.ico")；
    // SVG 在 Windows 下不被原生支持，因此动态尝试，失败则使用默认图标
    icon: process.env.NODE_ENV !== "production"
      ? path.join(process.env.APP_ROOT ?? process.cwd(), "public/favicon.svg")
      : undefined,
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0f0b26",
    autoHideMenuBar: true,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
    },
  });

  // 打开外链/非同源 URL 时用系统浏览器而不是窗口内跳转
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      shell.openExternal(url);
    } catch {
      /* ignore */
    }
    return { action: "deny" };
  });

  // 开发模式：Vite dev server；生产模式：打包后的 SPA
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    // 开发期自动打开 DevTools 以便调试
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

/* ---------- 应用生命周期 ---------- */

// macOS：当点击 Dock 图标且无窗口时重建
app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length === 0) createWindow();
  else allWindows[0].focus();
});

// 关闭所有窗口时退出（macOS 保留传统：应用保持驻留）
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// 移除菜单栏（Windows/Linux）避免原生菜单项泄露 IPC
app.on("ready", () => {
  Menu.setApplicationMenu(null);
});

app.whenReady().then(createWindow).catch(console.error);

/* ---------- 安全 IPC：最小化暴露 ---------- */

// 示例 ping：渲染层 window.electronAPI.ping('hi') → 'pong: hi'
ipcMain.handle("app:ping", (_e, msg: string) => `pong: ${msg}`);

// 暴露版本信息：electron/node/chrome
ipcMain.handle("app:versions", () => ({
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron,
  appName: app.getName(),
  appVersion: app.getVersion(),
}));
