// 全局共享类型定义

export type Role = "admin" | "user";

export type Permission =
  | "user:create"
  | "user:edit"
  | "user:delete"
  | "user:toggle"
  | "content:create"
  | "content:edit"
  | "content:publish"
  | "content:delete"
  | "system:view"
  | "system:edit";

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  roles: Role[];
  permissions: Permission[];
  status: "active" | "disabled";
  createdAt: string;
  lastLoginAt?: string;
}

/** 不含密码的安全用户对象 */
export type SafeUser = Omit<User, "password">;

export type ContentStatus = "draft" | "published";

export interface ContentItem {
  id: string;
  title: string;
  category: string;
  author: string;
  cover?: string;
  excerpt: string;
  content: string;
  status: ContentStatus;
  createdAt: string;
  publishedAt?: string;
}

export interface ServerMetric {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  timestamp: number;
}

export type LogLevel = "info" | "warn" | "error";

export interface OperationLog {
  id: string;
  user: string;
  action: string;
  level: LogLevel;
  timestamp: string;
}

export interface Club {
  id: string;
  name: string;
  cover: string;
  description: string;
  members: number;
  category: string;
  tags: string[];
}

/* -------- 前台 ACG 周边电商类型（不影响原 Club 类型） -------- */

export type ShopCategory =
  | "全部"
  | "手办模型"
  | "周边谷子"
  | "服饰穿搭"
  | "书籍漫画"
  | "影音音乐"
  | "数码数码";

export interface Product {
  id: string;
  name: string;
  category: Exclude<ShopCategory, "全部">;
  price: number; // 现价（分位：元）
  originalPrice: number; // 原价
  stock: number; // 库存
  sales: number; // 销量
  rating: number; // 评分 0-5
  coverGradient: string; // 渐变背景（同 Home.featured 方案）
  tags: string[]; // 标签
  description: string; // 描述
}

export interface CartItem extends Product {
  qty: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: number;
  avatar?: string;
}

/** 路由元信息 */
export interface RouteMeta {
  title?: string;
  /** 需要登录 */
  auth?: boolean;
  /** 允许的角色，未配置表示任意已登录用户 */
  roles?: Role[];
  /** 仅未登录用户可访问（如登录/注册页） */
  publicOnly?: boolean;
}
