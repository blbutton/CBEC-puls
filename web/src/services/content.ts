// 内容管理 API 适配层
// 将 mall-ArticleSummary 的 /article/* 接口适配为前端 Content 语义。
//
// 前端 ContentItem 与后端 ArticleVO 字段映射：
// - title/author/summary/content ↔ 同名
// - coverImage → cover
// - status(0/1) → status("draft"/"published")
// - createTime → createdAt
// - categoryName → category

import request from "@/utils/request";
import type { ArticleStatus, ArticleVO, CommonPage } from "@/types/api";
import type { ContentItem, ContentStatus } from "@/types";

/** 内容查询参数（前端语义） */
export interface ContentQuery {
  keyword?: string;
  category?: string;
  status?: ContentStatus | "all";
  page?: number;
  pageSize?: number;
}

/** 内容分页结果（前端语义） */
export interface ContentPage {
  list: ContentItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** 内容表单（前端语义） */
export interface ContentForm {
  title: string;
  category: string;
  author: string;
  cover?: string;
  excerpt: string;
  content: string;
  status: ContentStatus;
}

/** 后端 status(0/1) → 前端 status */
function adaptStatus(status: ArticleStatus): ContentStatus {
  return status === 1 ? "published" : "draft";
}

/** 前端 status → 后端 status */
function toBackendStatus(status: ContentStatus): ArticleStatus {
  return status === "published" ? 1 : 0;
}

/** ArticleVO → ContentItem 适配 */
function adaptContent(vo: ArticleVO): ContentItem {
  return {
    id: String(vo.id),
    title: vo.title,
    category: vo.categoryName || "未分类",
    author: vo.author,
    cover: vo.coverImage,
    excerpt: vo.summary,
    content: vo.content,
    status: adaptStatus(vo.status),
    createdAt: vo.createTime,
    publishedAt: vo.status === 1 ? vo.updateTime : undefined,
  };
}

/**
 * 分页查询内容列表
 * 对接 GET /article/list（mall-ArticleSummary）
 */
export async function fetchContents(query: ContentQuery): Promise<ContentPage> {
  const pageNum = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const res = await request.get<undefined, CommonPage<ArticleVO>>(
    "/article/list",
    {
      params: {
        keyword: query.keyword,
        pageNum,
        pageSize,
      },
    },
  );
  let list = res.list.map(adaptContent);
  // 客户端过滤（后端 keyword 为标题模糊，category/status 维度需客户端过滤）
  if (query.category) {
    list = list.filter((c) => c.category === query.category);
  }
  if (query.status && query.status !== "all") {
    list = list.filter((c) => c.status === query.status);
  }
  return {
    list,
    total: res.total,
    page: pageNum,
    pageSize,
  };
}

/**
 * 获取分类列表
 * 后端无独立分类接口，从文章列表聚合得出；失败时返回默认分类。
 */
export async function fetchCategories(): Promise<string[]> {
  const DEFAULT_CATEGORIES = ["动画评论", "漫画书评", "游戏攻略", "音乐推荐", "同人创作"];
  try {
    const res = await request.get<undefined, CommonPage<ArticleVO>>(
      "/article/list",
      { params: { pageNum: 1, pageSize: 200 } },
    );
    const set = new Set<string>(DEFAULT_CATEGORIES);
    res.list.forEach((a) => {
      if (a.categoryName) set.add(a.categoryName);
    });
    return Array.from(set);
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

/**
 * 创建内容
 * 对接 POST /article/create（mall-ArticleSummary）
 */
export async function createContent(form: ContentForm): Promise<ContentItem> {
  await request.post<unknown, void>("/article/create", {
    title: form.title,
    author: form.author,
    summary: form.excerpt,
    coverImage: form.cover ?? "",
    content: form.content,
    categoryId: 0,
    status: toBackendStatus(form.status),
  });
  return {
    id: String(Date.now()),
    title: form.title,
    category: form.category,
    author: form.author,
    cover: form.cover,
    excerpt: form.excerpt,
    content: form.content,
    status: form.status,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 更新内容
 * 对接 POST /article/update/{id}（mall-ArticleSummary）
 */
export async function updateContent(
  id: string,
  patch: Partial<ContentForm>,
): Promise<ContentItem> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    throw new Error("内容ID格式无效");
  }
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.author !== undefined) body.author = patch.author;
  if (patch.excerpt !== undefined) body.summary = patch.excerpt;
  if (patch.cover !== undefined) body.coverImage = patch.cover;
  if (patch.content !== undefined) body.content = patch.content;
  if (patch.status !== undefined) body.status = toBackendStatus(patch.status);
  await request.post<Record<string, unknown>, void>(
    `/article/update/${numericId}`,
    body,
  );
  return {
    id,
    title: patch.title ?? "",
    category: patch.category ?? "",
    author: patch.author ?? "",
    cover: patch.cover,
    excerpt: patch.excerpt ?? "",
    content: patch.content ?? "",
    status: patch.status ?? "draft",
    createdAt: new Date().toISOString(),
  };
}

/**
 * 删除单个内容
 * 对接 GET /article/delete/{id}（mall-ArticleSummary）
 */
export async function deleteContent(id: string): Promise<boolean> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    throw new Error("内容ID格式无效");
  }
  await request.get<undefined, void>(`/article/delete/${numericId}`);
  return true;
}

/**
 * 批量发布内容
 * 对接 POST /article/update/status（mall-ArticleSummary）
 */
export async function publishContents(ids: string[]): Promise<number> {
  const numericIds = ids.map((id) => Number(id)).filter((n) => Number.isFinite(n));
  if (numericIds.length === 0) return 0;
  await request.post<undefined, void>("/article/update/status", null, {
    params: { ids: numericIds.join(","), status: 1 },
  });
  return numericIds.length;
}

/**
 * 批量删除内容
 * 对接 POST /article/delete/batch（mall-ArticleSummary）
 */
export async function deleteContents(ids: string[]): Promise<number> {
  const numericIds = ids.map((id) => Number(id)).filter((n) => Number.isFinite(n));
  if (numericIds.length === 0) return 0;
  await request.post<undefined, void>("/article/delete/batch", null, {
    params: { ids: numericIds.join(",") },
  });
  return numericIds.length;
}
