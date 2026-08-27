// Electron 预加载脚本：sandbox=true，只能使用 contextBridge + ipcRenderer 受限 API
// 沙箱限制：不能 require Node 原生模块，不能直接访问主进程对象
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  /** 最小化的健康检查：ping → pong */
  ping: (msg: string) => ipcRenderer.invoke("app:ping", msg) as Promise<string>,

  /** 环境版本信息：{node, chrome, electron, appName, appVersion} */
  versions: () =>
    ipcRenderer.invoke("app:versions") as Promise<{
      node: string;
      chrome: string;
      electron: string;
      appName: string;
      appVersion: string;
    }>,

  /** 订阅主进程消息（预留）：返回 unsubscribe */
  onMessage: (channel: string, cb: (payload: unknown) => void) => {
    const allowed = new Set(["app:notification"]);
    if (!allowed.has(channel)) {
      console.warn(`[electronAPI] channel "${channel}" not allowed`);
      return () => {};
    }
    const listener = (
      _event: Electron.IpcRendererEvent,
      ...args: unknown[]
    ) => cb(args[0]);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
} as const);

export type ElectronAPI = typeof window extends {
  electronAPI: infer T;
}
  ? T
  : never;
