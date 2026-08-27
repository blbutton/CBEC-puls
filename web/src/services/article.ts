// mall-ArticleSummary 文章汇总 API 服务
// 对应后端 mall-ArticleSummary 模块：文章、新闻、论文、会员管理
//
// 该模块所有实体（文章/新闻/论文/会员）的 CRUD 接口形态高度一致，
// 这里按实体分别导出，便于调用方按业务领域引用。

import request from "@/utils/request";
import type {
  ArticleMemberForm,
  ArticleMemberVO,
  ArticleQueryParam,
  ArticleStatus,
  ArticleVO,
  ArticleForm,
  CommonPage,
  NewsForm,
  NewsVO,
  PaperForm,
  PaperVO,
} from "@/types/api";

/* ======================== 文章管理 ======================== */

/** 创建文章 */
export function createArticleApi(form: ArticleForm) {
  return request.post<ArticleForm, void>("/article/create", form);
}

/** 修改文章 */
export function updateArticleApi(id: number, form: ArticleForm) {
  return request.post<ArticleForm, void>(`/article/update/${id}`, form);
}

/** 删除指定文章 */
export function deleteArticleApi(id: number) {
  return request.get<undefined, void>(`/article/delete/${id}`);
}

/** 批量删除文章（application/json body） */
export function deleteArticlesBatchApi(ids: number[]) {
  return request.post<undefined, void>("/article/delete/batch", { ids });
}

/** 分页查询文章列表 */
export function listArticlesApi(params: ArticleQueryParam) {
  return request.get<undefined, CommonPage<ArticleVO>>("/article/list", {
    params,
  });
}

/**
 * 兼容旧调用方命名：等价于 listArticlesApi。
 * 保留以便 Article 页面以 getArticleListApi 命名引用。
 */
export const getArticleListApi = listArticlesApi;

/** 根据ID查询文章 */
export function getArticleApi(id: number) {
  return request.get<undefined, ArticleVO>(`/article/${id}`);
}

/** 批量修改文章状态（application/json body） */
export function updateArticleStatusApi(ids: number[], status: ArticleStatus) {
  return request.post<undefined, void>("/article/update/status", { ids, status });
}

/* ======================== 新闻管理 ======================== */

/** 创建新闻 */
export function createNewsApi(form: NewsForm) {
  return request.post<NewsForm, void>("/news/create", form);
}

/** 修改新闻 */
export function updateNewsApi(id: number, form: NewsForm) {
  return request.post<NewsForm, void>(`/news/update/${id}`, form);
}

/** 删除新闻 */
export function deleteNewsApi(id: number) {
  return request.get<undefined, void>(`/news/delete/${id}`);
}

/** 批量删除新闻（application/json body） */
export function deleteNewsBatchApi(ids: number[]) {
  return request.post<undefined, void>("/news/delete/batch", { ids });
}

/** 分页查询新闻列表 */
export function listNewsApi(params: ArticleQueryParam) {
  return request.get<undefined, CommonPage<NewsVO>>("/news/list", { params });
}

/** 根据ID查询新闻 */
export function getNewsApi(id: number) {
  return request.get<undefined, NewsVO>(`/news/${id}`);
}

/** 批量修改新闻状态（application/json body） */
export function updateNewsStatusApi(ids: number[], status: ArticleStatus) {
  return request.post<undefined, void>("/news/update/status", { ids, status });
}

/* ======================== 论文管理 ======================== */

/** 创建论文 */
export function createPaperApi(form: PaperForm) {
  return request.post<PaperForm, void>("/paper/create", form);
}

/** 修改论文 */
export function updatePaperApi(id: number, form: PaperForm) {
  return request.post<PaperForm, void>(`/paper/update/${id}`, form);
}

/** 删除论文 */
export function deletePaperApi(id: number) {
  return request.get<undefined, void>(`/paper/delete/${id}`);
}

/** 批量删除论文（application/json body） */
export function deletePapersBatchApi(ids: number[]) {
  return request.post<undefined, void>("/paper/delete/batch", { ids });
}

/** 分页查询论文列表 */
export function listPapersApi(params: ArticleQueryParam) {
  return request.get<undefined, CommonPage<PaperVO>>("/paper/list", { params });
}

/** 根据ID查询论文 */
export function getPaperApi(id: number) {
  return request.get<undefined, PaperVO>(`/paper/${id}`);
}

/** 批量修改论文状态（application/json body） */
export function updatePaperStatusApi(ids: number[], status: ArticleStatus) {
  return request.post<undefined, void>("/paper/update/status", { ids, status });
}

/* ======================== 会员管理（文章汇总模块） ======================== */

/** 创建会员 */
export function createArticleMemberApi(form: ArticleMemberForm) {
  return request.post<ArticleMemberForm, void>("/member/create", form);
}

/** 修改会员 */
export function updateArticleMemberApi(id: number, form: ArticleMemberForm) {
  return request.post<ArticleMemberForm, void>(`/member/update/${id}`, form);
}

/** 删除指定会员 */
export function deleteArticleMemberApi(id: number) {
  return request.get<undefined, void>(`/member/delete/${id}`);
}

/** 批量删除会员（application/json body） */
export function deleteArticleMembersBatchApi(ids: number[]) {
  return request.post<undefined, void>("/member/delete/batch", { ids });
}

/** 分页查询会员列表 */
export function listArticleMembersApi(params: ArticleQueryParam) {
  return request.get<undefined, CommonPage<ArticleMemberVO>>("/member/list", {
    params,
  });
}

/** 根据ID查询会员 */
export function getArticleMemberApi(id: number) {
  return request.get<undefined, ArticleMemberVO>(`/member/${id}`);
}

/** 批量修改会员状态（application/json body） */
export function updateArticleMemberStatusApi(
  ids: number[],
  status: ArticleStatus,
) {
  return request.post<undefined, void>("/member/update/status", { ids, status });
}
