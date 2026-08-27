// 统一 HTTP 请求客户端
//
// 基于 axios 封装，提供：
// 1. 身份验证：请求拦截器自动注入 Authorization token（从 localStorage 读取）
// 2. 请求/响应格式化：响应拦截器统一拆包 CommonResult<T> → T
// 3. 错误处理：HTTP 状态码、业务 code、网络错误、超时、取消分别映射到事件
// 4. 超时管理：默认 15s 超时；支持通过 config.timeout 设置单请求超时，
//    并提供 createCancellable() 基于 AbortController 实现手动取消
//
// 与后端契约（api-interfaces.html）：
// - 所有成功响应为 { code: 200, message, data }
// - code !== 200 视为业务异常，抛出 ApiError
// - 分页响应为 CommonPage<T>（作为 data 返回）

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  AxiosError,
  CanceledError,
} from "axios";
import BASE_URL from "@/config";
import type { CommonResult } from "@/types/api";
import emitter from "./eventEmittere";

/** 默认请求超时（毫秒） */
export const DEFAULT_TIMEOUT = 15000;

/** 扩展 AxiosRequestConfig，支持单请求超时与自定义取消 */
export interface RequestOptions extends AxiosRequestConfig {
  /** 单请求超时（毫秒），覆盖默认值 */
  timeout?: number;
}

/** 统一错误类型，携带可读 message、状态码、业务 code 与原始错误 */
export class ApiError extends Error {
  /** HTTP 状态码（网络错误时为 0） */
  readonly status: number;
  /** 后端业务 code（非业务错误时为 null） */
  readonly bizCode: number | null;
  /** 错误类别，便于上层分支处理 */
  readonly kind:
    | "network"
    | "timeout"
    | "aborted"
    | "http"
    | "business"
    | "unknown";
  /** 原始错误对象 */
  readonly cause?: unknown;

  constructor(
    message: string,
    opts: {
      status?: number;
      bizCode?: number | null;
      kind?: ApiError["kind"];
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = opts.status ?? 0;
    this.bizCode = opts.bizCode ?? null;
    this.kind = opts.kind ?? "unknown";
    this.cause = opts.cause;
  }
}

// 创建 axios 实例
const service: AxiosInstance = axios.create({
  baseURL: BASE_URL.BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

/** 请求拦截器：注入 Authorization token；POST/PUT/PATCH 统一使用 application/json；
 *  如调用方仍传入 params 但未传 data，则兜底把 params 合并到 body（保证向后兼容） */
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = token;
    }

    const method = String(config.method ?? "get").toLowerCase();
    const isBodyMethod =
      method === "post" || method === "put" || method === "patch";

    if (isBodyMethod) {
      // 强制 application/json（覆盖调用方显式设置的 form-urlencoded 等）
      config.headers = {
        ...(config.headers ?? {}),
        "Content-Type": "application/json",
      };

      const hasData =
        config.data !== undefined &&
        config.data !== null &&
        !(config.data instanceof FormData) &&
        !(config.data instanceof URLSearchParams) &&
        !(config.data instanceof Blob) &&
        !(config.data instanceof ArrayBuffer);

      const hasParams =
        config.params !== undefined &&
        config.params !== null &&
        typeof config.params === "object";

      // 兜底：调用方仍沿用 params 传参时，把 params 合并到 body
      // （注意：若 data 已是原始流/FormData 则不动，防止破坏上传场景）
      if (hasParams) {
        const paramsObj = config.params as Record<string, unknown>;
        if (!hasData) {
          config.data = { ...paramsObj };
        } else if (
          typeof config.data === "object" &&
          !Array.isArray(config.data)
        ) {
          // 两者都存在且 data 为对象：合并，同名键以 data 为准
          config.data = { ...paramsObj, ...(config.data as Record<string, unknown>) };
        }
        // 合并后清空 params，避免再拼到 URL 上
        config.params = undefined;
      }
    }

    return config;
  },
  (error) => {
    emitter.emit("API_REQUEST_FAIL", "请求拦截器错误：发起请求失败");
    return Promise.reject(error);
  },
);

/** 把 axios 错误转换为 ApiError，并 emit 对应事件 */
function normalizeError(err: unknown): ApiError {
  // 已经是 ApiError，直接返回
  if (err instanceof ApiError) return err;

  // axios 取消错误：可能来自超时 abort 或手动 cancel
  if (err instanceof CanceledError) {
    // 通过 message 约定区分：超时挂载时 code 为 "ERR_CANCELED"
    // 这里统一标记为 aborted，超时与否由调用方 config 决定；
    // 但若请求设置了 timeout 且被 abort，视为 timeout。
    const isTimeout = err.code === "ECONNABORTED" || err.message?.includes("timeout");
    const message = isTimeout ? "请求超时" : "请求已取消";
    const kind: ApiError["kind"] = isTimeout ? "timeout" : "aborted";
    emitter.emit(isTimeout ? "API_TIMEOUT" : "API_ABORT", message);
    return new ApiError(message, { kind, cause: err });
  }

  // axios 错误（含网络/HTTP）
  if (err instanceof AxiosError) {
    // 无 response：网络错误 / DNS / CORS / 断网
    if (!err.response) {
      const message = "网络连接失败，请检查网络";
      emitter.emit("API_NETWORK_ERROR", message);
      return new ApiError(message, { kind: "network", cause: err });
    }

    const status = err.response.status;
    const url = err.config?.url ?? "";
    switch (status) {
      case 400:
        emitter.emit("API_HTTP_ERROR", `请求参数错误：${url}`);
        break;
      case 401:
        emitter.emit("API_AUTH_EXPIRED", "登录已失效，请重新登录");
        localStorage.removeItem("token");
        break;
      case 403:
        emitter.emit("API_AUTH_FORBIDDEN", "权限不足，禁止访问");
        break;
      case 404:
        emitter.emit("API_HTTP_ERROR", `请求地址不存在：${url}`);
        break;
      case 500:
        emitter.emit("API_HTTP_ERROR", "服务器内部错误");
        break;
      default:
        emitter.emit("API_HTTP_ERROR", `请求异常（HTTP ${status}）`);
    }
    const message = extractErrorMessage(err.response) || `请求异常（HTTP ${status}）`;
    return new ApiError(message, { status, kind: "http", cause: err });
  }

  // 兜底
  const message = err instanceof Error ? err.message : "未知错误";
  emitter.emit("API_REQUEST_FAIL", message);
  return new ApiError(message, { kind: "unknown", cause: err });
}

/** 从 HTTP 响应体中尽力提取可读错误信息 */
function extractErrorMessage(response: AxiosResponse): string | null {
  const data = response?.data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.msg === "string") return obj.msg;
  }
  if (typeof data === "string" && data.length > 0) return data;
  return null;
}

/** 响应拦截器：拆包 CommonResult，并统一抛出 ApiError */
service.interceptors.response.use(
  (response) => {
    const res = response.data as CommonResult;

    // 非 CommonResult 结构（如文件流、第三方直传回调），原样返回
    if (!res || typeof res !== "object" || !("code" in res)) {
      return response.data;
    }

    // 业务异常
    if (res.code !== 200) {
      const msg = res.message || "请求异常";
      emitter.emit("API_BUSINESS_ERROR", msg);
      // 抛出 ApiError，进入下方错误分支
      throw new ApiError(msg, {
        bizCode: res.code,
        kind: "business",
      });
    }

    // 成功：返回 data 字段（已拆包）
    return res.data;
  },
  (error) => {
    const apiError = normalizeError(error);
    return Promise.reject(apiError);
  },
);

/**
 * 统一请求入口：根据 method 分发，返回拆包后的 data。
 *
 * 说明：axios 1.19 的泛型签名为 method<T, R, D, P>，返回
 * Promise<AxiosResponseResult<T, R, ...>>，当 R 不是 AxiosResponseDefault
 * 时解析为 R。由于响应拦截器在运行时已统一把 AxiosResponse 拆包成 data，
 * 这里把返回值断言为 Promise<TRes>，与拦截器行为保持一致。
 *
 * 泛型：
 * - TReq：请求体类型（仅用于文档化，不影响运行时）
 * - TRes：响应 data 字段类型
 */
const request = {
  get<TReq = unknown, TRes = unknown>(
    url: string,
    config?: RequestOptions,
  ): Promise<TRes> {
    return service.get<TReq, TRes>(url, applyTimeout(config)) as unknown as Promise<TRes>;
  },
  post<TReq = unknown, TRes = unknown>(
    url: string,
    data?: unknown,
    config?: RequestOptions,
  ): Promise<TRes> {
    return service.post<TReq, TRes>(
      url,
      data as TReq,
      applyTimeout(config),
    ) as unknown as Promise<TRes>;
  },
  put<TReq = unknown, TRes = unknown>(
    url: string,
    data?: unknown,
    config?: RequestOptions,
  ): Promise<TRes> {
    return service.put<TReq, TRes>(
      url,
      data as TReq,
      applyTimeout(config),
    ) as unknown as Promise<TRes>;
  },
  delete<TReq = unknown, TRes = unknown>(
    url: string,
    config?: RequestOptions,
  ): Promise<TRes> {
    return service.delete<TReq, TRes>(
      url,
      applyTimeout(config),
    ) as unknown as Promise<TRes>;
  },
  /** 原始 axios 实例，供高级场景使用 */
  raw: service,
};

/** 应用单请求超时：若 config.timeout 指定则覆盖实例默认值 */
function applyTimeout(config?: RequestOptions): AxiosRequestConfig {
  if (!config) return {};
  if (config.timeout && config.timeout > 0) {
    return { ...config, timeout: config.timeout };
  }
  return config;
}

/**
 * 创建可手动取消的请求句柄。
 * 用于：长轮询、页面卸载时取消未完成请求、防止竞态。
 *
 * @example
 * const handle = createCancellable();
 * handle.request(() => request.get('/x'), { timeout: 5000 })
 *   .then(data => ...);
 * // 取消：
 * handle.cancel();
 */
export function createCancellable() {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    cancel(reason?: string) {
      if (!controller.signal.aborted) {
        controller.abort();
        emitter.emit("API_CANCEL", reason ?? "手动取消请求");
      }
    },
    /** 在给定 signal 下执行请求；若已被取消则立即 reject */
    request<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
      if (controller.signal.aborted) {
        return Promise.reject(
          new ApiError("请求已取消", { kind: "aborted" }),
        );
      }
      return fn(controller.signal).catch((err) => {
        throw err instanceof ApiError ? err : normalizeError(err);
      });
    },
  };
}

export default request;
