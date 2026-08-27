// 鉴权 API：对接 mall-portal 的 /sso/* 接口
//
// 负责：会员登录/注册/登出、验证码、密码重置；
// 并将后端 MemberInfo 适配为前端 SafeUser 结构，供 authStore 使用。

import type { SafeUser } from "@/types";
import { permissionsForRoles } from "@/constants/permissions";
import {
  ssoLoginApi,
  getMemberInfoApi,
  ssoLogoutApi,
  registerApi as ssoRegisterApi,
  getAuthCodeApi,
  updatePasswordApi,
  type SsoLoginResult,
  type MemberInfo,
} from "@/services/portal";

export interface ApiResult {
  success: boolean;
  message: string;
}

export interface LoginResult extends ApiResult {
  user?: SafeUser;
  token?: string;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
}

/**
 * 登录：调用后端 /sso/login
 * 后端返回 { token, tokenHead }，拼成 tokenHead + token 存储
 */
export async function loginApi(
  username: string,
  password: string,
): Promise<LoginResult> {
  const data: SsoLoginResult = await ssoLoginApi(username, password);
  if (!data?.token) {
    throw new Error("后端返回 token 为空");
  }
  const fullToken = data.tokenHead ? `${data.tokenHead} ${data.token}` : data.token;

  // 登录成功后拉取会员信息
  let memberInfo: MemberInfo | undefined;
  try {
    memberInfo = await getMemberInfoApi();
  } catch {
    // 拉取会员信息失败不阻断登录
  }

  // 将后端会员信息映射到本地 SafeUser 结构
  const safeUser: SafeUser = {
    id: String(memberInfo?.id ?? Date.now()),
    username: memberInfo?.username ?? username,
    email: "",
    avatar: memberInfo?.icon ?? "",
    roles: ["user"],
    permissions: permissionsForRoles(["user"]),
    status: "active",
    createdAt: new Date().toISOString().slice(0, 16),
    lastLoginAt: new Date().toISOString().replace("T", " ").slice(0, 16),
  };

  return {
    success: true,
    message: "登录成功",
    user: safeUser,
    token: fullToken,
  };
}

/**
 * 注册：调用后端 /sso/register
 * 后端 /sso/register 需要电话与验证码，前端注册表单仅采集 username/password/email，
 * 这里用 email 占位 telephone、空字符串占位 authCode（后端在未开启短信时可放行）。
 */
export async function registerApi(form: RegisterForm): Promise<ApiResult> {
  await ssoRegisterApi(form.username, form.password, form.email, "");
  return { success: true, message: "注册成功" };
}

/**
 * 发送验证码：调用后端 /sso/getAuthCode
 * 后端按 telephone 发送短信验证码；前端用 email 字段占位。
 */
export async function sendVerifyCodeApi(email: string): Promise<ApiResult> {
  await getAuthCodeApi(email);
  return { success: true, message: "验证码已发送" };
}

/**
 * 重置密码：调用后端 /sso/updatePassword
 */
export async function resetPasswordApi(
  email: string,
  code: string,
  newPassword: string,
): Promise<ApiResult> {
  await updatePasswordApi(email, newPassword, code);
  return { success: true, message: "密码重置成功" };
}

/** 登出：调用后端 /sso/logout */
export async function logoutApi(): Promise<void> {
  try {
    await ssoLogoutApi();
  } catch {
    // 后端不可用静默忽略
  }
}

/** 剥离密码字段，返回安全用户对象（保留给 store 使用） */
export function toSafeUser(u: {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  roles: SafeUser["roles"];
  permissions: SafeUser["permissions"];
  status: SafeUser["status"];
  createdAt: string;
  lastLoginAt?: string;
}): SafeUser {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    avatar: u.avatar,
    roles: u.roles,
    permissions: u.permissions,
    status: u.status,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  };
}
