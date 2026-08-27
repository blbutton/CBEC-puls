// 路由表：react-router-dom v7 RouteObject 配置，含 meta(handle.title) / 守卫 / 懒加载
/* eslint-disable react-refresh/only-export-components */
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { lazyLoad } from "./lazy";
import { RequireAuth, RequireRole, RedirectIfAuthed } from "./guards";
import { AuthLayout } from "@/LR";
import { AdminLayout } from "@/admin";
import { ReceptionLayout } from "@/reception";
import { useAuthStore } from "@/store/auth";

// 懒加载页面
const Login = lazyLoad(() => import("@/LR/Login"));
const Register = lazyLoad(() => import("@/LR/Register"));
const ForgotPassword = lazyLoad(() => import("@/LR/ForgotPassword"));

const Dashboard = lazyLoad(() => import("@/admin/pages/Dashboard"));
const UserManagement = lazyLoad(() => import("@/admin/pages/UserManagement"));
const ContentManagement = lazyLoad(
  () => import("@/admin/pages/ContentManagement"),
);
const SystemMonitor = lazyLoad(() => import("@/admin/pages/SystemMonitor"));
const SystemSettings = lazyLoad(() => import("@/admin/pages/SystemSettings"));

const Home = lazyLoad(() => import("@/reception/pages/Home"));
const Shop = lazyLoad(() => import("@/reception/pages/Shop/Shop"));
const ChatRoom = lazyLoad(() => import("@/reception/pages/ChatRoom/ChatRoom"));
const Article = lazyLoad(() => import("@/reception/pages/Article/Article"));
const About = lazyLoad(() => import("@/reception/pages/About/About"));

const NotFound = lazyLoad(() => import("@/router/NotFound"));

/** 根路径重定向：admin 登录 → /admin，其余 → /reception */
function RootRedirect() {
  const token = useAuthStore((s) => s.token);
  const isAdmin = useAuthStore((s) => s.roles.includes("admin"));
  return <Navigate to={token && isAdmin ? "/admin" : "/reception"} replace />;
}

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootRedirect />,
    handle: { title: "首页" },
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: (
          <RedirectIfAuthed>
            <Login />
          </RedirectIfAuthed>
        ),
        handle: { title: "登录" },
      },
      {
        path: "/register",
        element: (
          <RedirectIfAuthed>
            <Register />
          </RedirectIfAuthed>
        ),
        handle: { title: "注册" },
      },
      {
        path: "/forgot-password",
        element: (
          <RedirectIfAuthed>
            <ForgotPassword />
          </RedirectIfAuthed>
        ),
        handle: { title: "找回密码" },
      },
    ],
  },
  {
    path: "/reception",
    element: <ReceptionLayout />,
    handle: { title: "前台" },
    children: [
      { index: true, element: <Home />, handle: { title: "首页" } },
      { path: "shop", element: <Shop />, handle: { title: "周边商城" } },
      { path: "article", element: <Article />, handle: { title: "文章" } },
      { path: "chat", element: <ChatRoom />, handle: { title: "AI 聊天室" } },
      { path: "about", element: <About />, handle: { title: "关于" } },
    ],
  },
  {
    path: "/admin",
    element: (
      <RequireAuth>
        <RequireRole roles={["admin"]}>
          <AdminLayout />
        </RequireRole>
      </RequireAuth>
    ),
    handle: { title: "后台" },
    children: [
      { index: true, element: <Dashboard />, handle: { title: "首页" } },
      {
        path: "users",
        element: <UserManagement />,
        handle: { title: "用户管理" },
      },
      {
        path: "content",
        element: <ContentManagement />,
        handle: { title: "内容管理" },
      },
      {
        path: "monitor",
        element: <SystemMonitor />,
        handle: { title: "系统监控" },
      },
      {
        path: "settings",
        element: <SystemSettings />,
        handle: { title: "系统管理" },
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
    handle: { title: "404" },
  },
];
