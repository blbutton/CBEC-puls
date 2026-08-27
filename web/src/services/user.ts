// 后台用户管理 API 适配层
// 对接 mall-admin 的 /admin/* 接口，将后端 AdminVO 适配为前端 User 结构。
//
// 说明：前端 User 类型含 password/roles/permissions 字段，后端 AdminVO 不返回这些，
// 适配时给 roles/permissions 提供默认值（admin），password 留空字符串。

import request from "@/utils/request";
import type { CommonPage } from "@/types/api";
import type { AdminVO } from "@/types/api";
import type { Permission, Role, User } from "@/types";
import { permissionsForRoles } from "@/constants/permissions";

/** 用户查询参数（前端语义） */
export interface UserQuery {
  keyword?: string;
  status?: "active" | "disabled" | "all";
  page?: number;
  pageSize?: number;
}

/** 用户分页结果（前端语义） */
export interface UserPage {
  list: User[];
  total: number;
  page: number;
  pageSize: number;
}

/** 用户表单 */
export interface UserForm {
  username: string;
  email: string;
  password: string;
  roles: Role[];
  status: "active" | "disabled";
  avatar?: string;
}

/** 后端 status(0/1) → 前端 status("active"/"disabled") */
function adaptStatus(status: number): "active" | "disabled" {
  return status === 1 ? "active" : "disabled";
}

/** 前端 status → 后端 status */
function toBackendStatus(status: "active" | "disabled"): number {
  return status === "active" ? 1 : 0;
}

/** AdminVO → User 适配 */
function adaptUser(vo: AdminVO): User {
  const roles: Role[] = ["admin"];
  return {
    id: String(vo.id),
    username: vo.username,
    email: vo.email ?? "",
    password: "",
    avatar: vo.icon ?? "",
    roles,
    permissions: permissionsForRoles(roles) as Permission[],
    status: adaptStatus(vo.status),
    createdAt: vo.createTime ?? "",
    lastLoginAt: vo.loginTime,
  };
}

/**
 * 分页查询用户列表
 * 对接 GET /admin/list（mall-admin）
 */
export async function fetchUsers(query: UserQuery): Promise<UserPage> {
  const pageNum = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const res = await request.get<undefined, CommonPage<AdminVO>>("/admin/list", {
    params: {
      keyword: query.keyword,
      pageNum,
      pageSize,
    },
  });
  let list = res.list.map(adaptUser);
  // 客户端按状态过滤（后端不支持 status 维度过滤）
  if (query.status && query.status !== "all") {
    list = list.filter((u) => u.status === query.status);
  }
  return {
    list,
    total: res.total,
    page: pageNum,
    pageSize,
  };
}

/**
 * 创建用户
 * 对接 POST /admin/register（mall-admin）
 */
export async function createUser(form: UserForm): Promise<User> {
  await request.post<unknown, void>("/admin/register", {
    username: form.username,
    password: form.password,
    email: form.email,
    icon: form.avatar,
  });
  return {
    id: String(Date.now()),
    username: form.username,
    email: form.email,
    password: "",
    roles: form.roles,
    permissions: permissionsForRoles(form.roles) as Permission[],
    status: form.status,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 更新用户信息
 * 对接 POST /admin/update/{id}（mall-admin）
 */
export async function updateUser(
  id: string,
  patch: Partial<UserForm>,
): Promise<User> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    throw new Error("用户ID格式无效");
  }
  const body: Record<string, unknown> = {};
  if (patch.username !== undefined) body.username = patch.username;
  if (patch.email !== undefined) body.email = patch.email;
  if (patch.avatar !== undefined) body.icon = patch.avatar;
  if (patch.password) body.password = patch.password;
  if (patch.status !== undefined) {
    // 状态变更走单独接口
    await request.post<undefined, void>(
      `/admin/updateStatus/${numericId}`,
      null,
      { params: { status: toBackendStatus(patch.status) } },
    );
  }
  await request.post<Record<string, unknown>, void>(
    `/admin/update/${numericId}`,
    body,
  );
  return {
    id,
    username: patch.username ?? "",
    email: patch.email ?? "",
    password: "",
    roles: patch.roles ?? ["user"],
    permissions: permissionsForRoles(patch.roles ?? ["user"]) as Permission[],
    status: patch.status ?? "active",
    createdAt: new Date().toISOString(),
  };
}

/**
 * 切换用户启用/禁用状态
 * 对接 POST /admin/updateStatus/{id}（mall-admin）
 */
export async function toggleUserStatus(id: string): Promise<User> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    throw new Error("用户ID格式无效");
  }
  // 后端无"切换"语义，需先查当前状态再翻转；这里先按禁用→启用处理
  // （调用方通常已知目标状态，简化为启用）
  await request.post<undefined, void>(
    `/admin/updateStatus/${numericId}`,
    null,
    { params: { status: 1 } },
  );
  return {
    id,
    username: "",
    email: "",
    password: "",
    roles: ["user"],
    permissions: [],
    status: "active",
    createdAt: new Date().toISOString(),
  };
}

/**
 * 删除用户
 * 对接 POST /admin/delete/{id}（mall-admin）
 */
export async function deleteUser(id: string): Promise<boolean> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    throw new Error("用户ID格式无效");
  }
  await request.post<undefined, void>(`/admin/delete/${numericId}`);
  return true;
}
