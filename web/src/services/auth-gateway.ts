// mall-auth 统一认证授权 API 服务
// 对应后端 mall-auth 模块：统一登录入口，返回 token

import request from "@/utils/request";
import type { AuthLoginParam, AuthLoginResult } from "@/types/api";

/**
 * 统一登录：通过 clientId 区分客户端（前台/后台）。
 * 后端 /auth/login 通过 query 接收 clientId/username/password。
 */
export function authLoginApi(param: AuthLoginParam) {
  return request.post<undefined, AuthLoginResult>("/auth/login", null, {
    params: {
      clientId: param.clientId,
      username: param.username,
      password: param.password,
    },
  });
}
