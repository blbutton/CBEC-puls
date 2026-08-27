// mall-search 搜索系统 API 服务
// 对应后端 mall-search 模块：基于 Elasticsearch 的商品搜索、推荐、关联信息

import request from "@/utils/request";
import type {
  CommonPage,
  EsProductVO,
  EsSearchParam,
  EsSearchRelate,
} from "@/types/api";

/** 导入所有数据库中商品到 ES */
export function importAllToEsApi() {
  return request.post<undefined, void>("/esProduct/importAll");
}

/** 根据 id 删除 ES 商品 */
export function deleteEsProductApi(id: number) {
  return request.get<undefined, void>(`/esProduct/delete/${id}`);
}

/** 批量删除 ES 商品 */
export function deleteEsProductsBatchApi(ids: number[]) {
  return request.post<undefined, void>("/esProduct/delete/batch", null, {
    params: { ids: ids.join(",") },
  });
}

/** 根据 id 创建 ES 商品 */
export function createEsProductApi(id: number) {
  return request.post<undefined, void>(`/esProduct/create/${id}`);
}

/** 简单搜索 */
export function searchSimpleApi(params: {
  keyword: string;
  pageNum?: number;
  pageSize?: number;
}) {
  return request.get<undefined, CommonPage<EsProductVO>>(
    "/esProduct/search/simple",
    { params },
  );
}

/** 综合搜索、筛选、排序 */
export function searchProductsApi(params: EsSearchParam) {
  return request.get<undefined, CommonPage<EsProductVO>>("/esProduct/search", {
    params,
  });
}

/** 根据商品 id 推荐商品 */
export function recommendProductsApi(
  id: number,
  pageNum = 1,
  pageSize = 6,
) {
  return request.get<undefined, CommonPage<EsProductVO>>(
    `/esProduct/recommend/${id}`,
    { params: { pageNum, pageSize } },
  );
}

/** 获取搜索的相关品牌、分类及筛选属性 */
export function searchRelateApi(keyword: string) {
  return request.get<undefined, EsSearchRelate>("/esProduct/search/relate", {
    params: { keyword },
  });
}
