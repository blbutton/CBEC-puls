const API_EVENT_NAMES = [
  // 请求生命周期
  "API_REQUEST_START", // 请求发起
  "API_REQUEST_SUCCESS", // 请求成功
  "API_REQUEST_FAIL", // 请求失败（业务异常）
  "API_REQUEST_COMPLETE", // 请求完成(无论成功失败)

  // HTTP 层面异常
  "API_HTTP_ERROR", // http状态码异常 4xx/5xx
  "API_NETWORK_ERROR", // 网络错误、断网、跨域
  "API_TIMEOUT", // 请求超时
  "API_ABORT", // 请求被取消/abort
  "API_CANCEL", // 手动取消请求

  // 业务&鉴权
  "API_AUTH_EXPIRED", // token过期 401
  "API_AUTH_FORBIDDEN", // 无权限 403
  "API_BUSINESS_ERROR", // 业务code非0错误

  // 重试、缓存
  "API_RETRY", // 触发重试
  "API_RETRY_FAIL", // 重试全部失败
  "API_CACHE_HIT", // 命中本地缓存
  "API_CACHE_MISS", // 未命中缓存

  // 埋点监控
  "API_PERFORMANCE", // api性能上报
  "API_SLOW", // 慢请求告警
] as const;

const EVENT_NAMES = [...API_EVENT_NAMES, "LOG", "ERROR", "REFRESH"] as const;

export default EVENT_NAMES;
