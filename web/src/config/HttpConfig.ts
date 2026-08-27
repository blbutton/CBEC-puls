// 后端 API 基础地址
// 开发环境通过 Vite proxy 代理到后端（见 vite.config.ts server.proxy）
// 生产环境通过环境变量 VITE_API_BASE_URL 注入，默认走相对路径
//
// 说明：
// - 开发环境 BASE_URL = "/api"，由 Vite dev server 的 proxy 转发到 mall-portal 前台服务
//   （vite.config.ts 中 /api -> http://localhost:8085），避免浏览器跨域。
//   如需走网关，设置环境变量 VITE_PROXY_TARGET=http://localhost:8201 即可。
// - 生产环境使用 import.meta.env.VITE_API_BASE_URL 注入实际后端地址。
// - 前端 POST/PUT 请求统一使用 application/json 传参。
//   vite dev proxy 会把 JSON body 自动降级为 query 参数，以兼容仍使用 @RequestParam
//   的后端接口；待后端改为 @RequestBody 后，关闭 vite.config.ts 的
//   JSON_TO_QUERY_COMPAT 开关即可。
export const BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "/api";
