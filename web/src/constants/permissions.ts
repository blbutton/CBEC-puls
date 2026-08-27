// 角色权限常量与工具函数

import type { Permission, Role } from "@/types";

export const ADMIN_PERMISSIONS: Permission[] = [
  "user:create",
  "user:edit",
  "user:delete",
  "user:toggle",
  "content:create",
  "content:edit",
  "content:publish",
  "content:delete",
  "system:view",
  "system:edit",
];

export const USER_PERMISSIONS: Permission[] = [
  "content:create",
  "content:edit",
];

/** 根据角色推导默认权限点 */
export function permissionsForRoles(roles: Role[]): Permission[] {
  const set = new Set<Permission>();
  for (const r of roles) {
    if (r === "admin") ADMIN_PERMISSIONS.forEach((p) => set.add(p));
    else USER_PERMISSIONS.forEach((p) => set.add(p));
  }
  return Array.from(set);
}
