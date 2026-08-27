// 路由守卫：RequireAuth / RequireRole / RedirectIfAuthed
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import type { Role } from "@/types";

interface GuardProps {
  children: ReactNode;
}

/** 未登录 → 跳转 /login，并记录来源位置以便登录后回跳 */
export function RequireAuth({ children }: GuardProps) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

/** 无对应角色 → 跳转 /reception（避免后台暴露） */
export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const userRoles = useAuthStore((s) => s.roles);
  const allowed = userRoles.some((r) => roles.includes(r));
  if (!allowed) {
    return <Navigate to="/reception" replace />;
  }
  return <>{children}</>;
}

/** 已登录访问登录/注册页 → 跳转 /admin */
export function RedirectIfAuthed({ children }: GuardProps) {
  const token = useAuthStore((s) => s.token);
  if (token) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}
