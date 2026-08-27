import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'
  return {
    // Electron file:// 加载需要相对路径
    base: './',
    plugins: [
      react({
        babel: {
          babelrc: false,
          configFile: false,
        },
      }),
      // Vite 8 原生支持：vite-plugin-electron@1.x + simple 预设
      electron({
        main: {
          entry: 'electron/main.ts',
          vite: {
            build: {
              outDir: 'dist-electron',
              minify: isProd,
              sourcemap: !isProd,
              target: 'node20',
            },
          },
        },
        preload: {
          input: 'electron/preload.ts',
          vite: {
            build: {
              outDir: 'dist-electron',
              minify: isProd,
              sourcemap: !isProd,
              target: 'node20',
            },
          },
        },
        // 注意：renderer 选项需要额外安装 vite-plugin-electron-renderer，
        // 当前项目的 Vite SPA 构建已能独立工作，因此不启用。
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
      // 对深层嵌套的第三方库路径做 dedupe，避免出现重复打包
      dedupe: ['react', 'react-dom', 'react-router-dom', 'zustand'],
    },
    server: {
      port: 5173,
      open: false,
      fs: {
        cachedChecks: false,
      },
      // 后端 API 代理：所有 /api 请求转发到 mall-portal 前台商城服务（8085）
      // 由于 mall-swarm 网关 8201 在不同环境可能不可用，这里直连前台服务最稳定；
      // 若希望统一走网关可改为 http://localhost:8201 或设置 VITE_PROXY_TARGET 环境变量。
      proxy: {
        "/api": {
          target: process.env.VITE_PROXY_TARGET ?? "http://localhost:8201",
          changeOrigin: true,
          // ===== JSON body → query string 降级适配（过渡期兼容）=====
          // 前端统一改为 application/json 传参，但后端部分接口仍为 @RequestParam（query/form）。
          // 开发模式下代理层会把 JSON body 的字段拆成 query 参数转发，保证后端无需立即改造也能跑。
          // 当后端已切换为 @RequestBody（DTO）时，把下面的 JSON_TO_QUERY_COMPAT 设为 false 即可。
          configure: (proxy, options) => {
            const JSON_TO_QUERY_COMPAT = true;
            if (!JSON_TO_QUERY_COMPAT) return;

            // 先由代理中间件读取 JSON body 并解析成对象，挂到 req.body 上
            (options as unknown as { bodyParser?: boolean }).bodyParser = true;

            proxy.on("proxyReq", (proxyReq, req) => {
              const method = (req.method ?? "GET").toUpperCase();
              if (method !== "POST" && method !== "PUT" && method !== "PATCH") return;

              const ctype = String(req.headers["content-type"] ?? "").toLowerCase();
              if (!ctype.includes("application/json")) return;

              const body = (req as unknown as { body?: unknown }).body;
              if (body === undefined || body === null || typeof body !== "object") return;
              if (Buffer.isBuffer(body)) return;

              // 把 JSON 体展平为 query 参数
              const qp = new URLSearchParams();
              const append = (k: string, v: unknown) => {
                if (v === undefined || v === null) return;
                if (Array.isArray(v)) {
                  // 后端 @RequestParam List<Long> ids 默认使用逗号分隔作为约定
                  qp.append(k, v.join(","));
                } else if (typeof v === "object") {
                  qp.append(k, JSON.stringify(v));
                } else {
                  qp.append(k, String(v));
                }
              };
              for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
                append(k, v);
              }
              const queryStr = qp.toString();
              if (!queryStr) return;

              const originalPath = proxyReq.path ?? "";
              const [pathOnly, existingQuery] = originalPath.split("?");
              const mergedQuery = existingQuery
                ? `${existingQuery}&${queryStr}`
                : queryStr;
              proxyReq.path = `${pathOnly}?${mergedQuery}`;

              // 清空 body 与 Content-*，避免后端仍按 JSON 体接收导致冲突
              proxyReq.setHeader("Content-Length", "0");
              proxyReq.removeHeader("Content-Type");
            });
          },
          autoRewrite: true,
          selfHandleResponse: false,
        },
      },
    },
    json: {
      // 以具名导入方式仅引用 JSON 中用到的字段，减小打包体积
      namedExports: true,
      stringify: false,
    },
    build: {
      target: 'es2020',
      minify: 'oxc',
      cssMinify: isProd,
      // 生产环境关闭 sourcemap，减小产物体积
      sourcemap: !isProd,
      // 小于 4KB 的资源内联为 base64，减少请求数
      assetsInlineLimit: 4096,
      // 分 chunk 缓存策略
      chunkSizeWarningLimit: 1200,
      reportCompressedSize: isProd,
      // Vite 8 默认使用 rolldown 打包（兼容 rollup 配置）
      rollupOptions: {
        output: {
          // 自定义输出命名，方便 CDN 强缓存
          entryFileNames: isProd
            ? 'js/[name]-[hash].js'
            : 'js/[name].js',
          chunkFileNames: isProd
            ? 'js/[name]-[hash].js'
            : 'js/[name].js',
          assetFileNames: (assetInfo) => {
            const ext = (assetInfo.name ?? '').split('.').pop()?.toLowerCase()
            if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext ?? '')) {
              return isProd
                ? 'img/[name]-[hash][extname]'
                : 'img/[name][extname]'
            }
            if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(ext ?? '')) {
              return isProd
                ? 'font/[name]-[hash][extname]'
                : 'font/[name][extname]'
            }
            return isProd
              ? 'css/[name]-[hash][extname]'
              : 'css/[name][extname]'
          },
          manualChunks(id) {
            // 1. React 核心：稳定，几乎不升级，适合独立强缓存
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/') ||
              id.includes('node_modules/react/jsx-runtime')
            ) {
              return 'vendor-react'
            }
            // 2. 路由相关
            if (id.includes('node_modules/react-router') || id.includes('@remix-run')) {
              return 'vendor-router'
            }
            // 3. Ant Design 图标（比较大，独立拆）
            if (id.includes('node_modules/@ant-design')) {
              return 'vendor-antd-icons'
            }
            // 4. 状态管理
            if (id.includes('node_modules/zustand')) {
              return 'vendor-zustand'
            }
            // 5. 其它第三方 UI / 工具集中
            if (id.includes('node_modules/antd') || id.includes('node_modules/dayjs')) {
              return 'vendor-ui'
            }
            // 6. 剩余 node_modules 归总，避免散碎 chunk
            if (id.includes('node_modules')) {
              return 'vendor-other'
            }
            // 业务代码按目录做粗颗粒度拆分：前台 / 后台 / 鉴权
            if (id.includes('/src/admin/')) {
              return 'app-admin'
            }
            if (id.includes('/src/reception/')) {
              return 'app-reception'
            }
            if (id.includes('/src/LR/')) {
              return 'app-auth'
            }
            // 共享的 store/types/mock 单独成块，避免重复引用
            if (
              id.includes('/src/store/') ||
              id.includes('/src/types/') ||
              id.includes('/src/mock/')
            ) {
              return 'app-common'
            }
            return undefined
          },
        },
      },
    },
    oxc: {
      runtime: {
        helpers: 'isolated',
      },
    },
    optimizeDeps: {
      // 预构建依赖列表，避免首次打开页面冷启动加载过慢
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react-router-dom',
        'zustand',
        '@ant-design/icons',
        'dayjs',
      ],
      // Vite 8 使用 Rolldown 做依赖预构建
      rolldownOptions: {
        platform: 'browser',
      },
    },
  }
})
