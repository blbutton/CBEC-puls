// mall-portal 前台商城 API 服务
// 对应后端 mall-portal 模块，包含会员、商品、购物车、订单、首页等接口
//
// 所有方法返回的 Promise 已经是后端 CommonResult 拆包后的 data 字段
// （由 utils/request.ts 的响应拦截器统一处理）。

import request from "@/utils/request";
import type {
  CartItemParam,
  CartItemVO,
  CommonPage,
  HomeContent,
  MemberInfo,
  MemberReceiveAddress,
  OrderDetailVO,
  OrderListItem,
  OrderParam,
  PortalProduct,
  ProductCategoryNode,
  SsoLoginResult,
} from "@/types/api";

// 重新导出类型，便于 auth 等模块按需引用
export type { MemberInfo, SsoLoginResult };

/* ======================== 会员 SSO 接口 ======================== */

/** 会员注册（application/json body） */
export function registerApi(
  username: string,
  password: string,
  telephone: string,
  authCode: string,
) {
  return request.post<undefined, void>("/sso/register", {
    username,
    password,
    telephone,
    authCode,
  });
}

/** 会员登录（application/json body） */
export function ssoLoginApi(username: string, password: string) {
  return request.post<undefined, SsoLoginResult>("/admin/login", {
    username,
    password,
  });
}

/** 获取会员信息 */
export function getMemberInfoApi() {
  return request.get<undefined, MemberInfo>("/sso/info");
}

/** 登出 */
export function ssoLogoutApi() {
  return request.post<undefined, void>("/sso/logout");
}

/** 获取验证码 */
export function getAuthCodeApi(telephone: string) {
  return request.get<undefined, void>("/sso/getAuthCode", {
    params: { telephone },
  });
}

/** 修改密码（application/json body） */
export function updatePasswordApi(
  telephone: string,
  password: string,
  authCode: string,
) {
  return request.post<undefined, void>("/sso/updatePassword", {
    telephone,
    password,
    authCode,
  });
}

/* ======================== 前台商品接口 ======================== */

/** 综合搜索、筛选、排序 */
export function searchProductsApi(params: {
  keyword?: string;
  brandId?: number;
  productCategoryId?: number;
  pageNum?: number;
  pageSize?: number;
  sort?: number;
}) {
  return request.get<undefined, CommonPage<PortalProduct>>("/product/search", {
    params,
  });
}

/** 以树形结构获取所有商品分类 */
export function getCategoryTreeApi() {
  return request.get<undefined, ProductCategoryNode[]>(
    "/product/categoryTreeList",
  );
}

/** 获取前台商品详情 */
export function getProductDetailApi(id: number) {
  return request.get<undefined, PortalProduct>(`/product/detail/${id}`);
}

/* ======================== 前台品牌接口 ======================== */

/** 分页获取推荐品牌 */
export function getRecommendBrandsApi(pageNum = 1, pageSize = 6) {
  return request.get<undefined, CommonPage<unknown>>("/brand/recommendList", {
    params: { pageNum, pageSize },
  });
}

/** 获取品牌详情 */
export function getBrandDetailApi(brandId: number) {
  return request.get<undefined, unknown>(`/brand/detail/${brandId}`);
}

/** 分页获取品牌相关商品 */
export function getBrandProductsApi(
  brandId: number,
  pageNum = 1,
  pageSize = 6,
) {
  return request.get<undefined, CommonPage<PortalProduct>>(
    "/brand/productList",
    { params: { brandId, pageNum, pageSize } },
  );
}

/* ======================== 购物车接口 ======================== */

/** 添加商品到购物车 */
export function addCartApi(cartItem: CartItemParam) {
  return request.post<undefined, void>("/cart/add", cartItem);
}

/** 获取会员购物车列表 */
export function getCartListApi() {
  return request.get<undefined, CartItemVO[]>("/cart/list");
}

/** 获取含促销信息的购物车列表 */
export function getCartListPromotionApi(cartIds: number[]) {
  return request.get<undefined, unknown>("/cart/list/promotion", {
    params: { cartIds: cartIds.join(",") },
  });
}

/** 修改购物车中商品数量（application/json body） */
export function updateCartQtyApi(id: number, quantity: number) {
  return request.post<undefined, void>("/cart/update/quantity", {
    id,
    quantity,
  });
}

/** 修改购物车中商品的规格 */
export function updateCartAttrApi(cartItem: CartItemParam) {
  return request.post<undefined, void>("/cart/update/attr", cartItem);
}

/** 删除购物车中的商品（application/json body，ids 数组） */
export function deleteCartApi(ids: number[]) {
  return request.post<undefined, void>("/cart/delete", { ids });
}

/** 清空购物车 */
export function clearCartApi() {
  return request.post<undefined, void>("/cart/clear");
}

/* ======================== 首页内容接口 ======================== */

/** 首页内容聚合 */
export function getHomeContentApi() {
  return request.get<undefined, HomeContent>("/home/content");
}

/** 推荐商品分页 */
export function getRecommendProductsApi(pageNum = 1, pageSize = 6) {
  return request.get<undefined, CommonPage<PortalProduct>>(
    "/home/recommendProductList",
    { params: { pageNum, pageSize } },
  );
}

/** 首页商品分类 */
export function getHomeProductCateApi(parentId: number) {
  return request.get<undefined, unknown>(`/home/productCateList/${parentId}`);
}

/** 首页专题列表 */
export function getHomeSubjectApi(
  cateId: number,
  pageNum = 1,
  pageSize = 4,
) {
  return request.get<undefined, CommonPage<unknown>>("/home/subjectList", {
    params: { cateId, pageNum, pageSize },
  });
}

/** 人气推荐商品 */
export function getHotProductsApi(pageNum = 1, pageSize = 6) {
  return request.get<undefined, CommonPage<PortalProduct>>(
    "/home/hotProductList",
    { params: { pageNum, pageSize } },
  );
}

/** 新品推荐商品 */
export function getNewProductsApi(pageNum = 1, pageSize = 6) {
  return request.get<undefined, CommonPage<PortalProduct>>(
    "/home/newProductList",
    { params: { pageNum, pageSize } },
  );
}

/* ======================== 订单接口 ======================== */

/** 生成确认单 */
export function generateConfirmOrderApi(cartIds: number[]) {
  return request.post<undefined, unknown>(
    "/order/generateConfirmOrder",
    cartIds,
  );
}

/** 生成订单 */
export function generateOrderApi(orderParam: OrderParam) {
  return request.post<undefined, { order: unknown }>(
    "/order/generateOrder",
    orderParam,
  );
}

/** 支付成功回调（application/json body） */
export function paySuccessApi(orderId: number, payType: number) {
  return request.post<undefined, void>("/order/paySuccess", { orderId, payType });
}

/** 获取用户订单列表 */
export function getOrderListApi(params: {
  status?: number;
  pageNum?: number;
  pageSize?: number;
}) {
  return request.get<undefined, CommonPage<OrderListItem>>("/order/list", {
    params,
  });
}

/** 获取订单详情 */
export function getOrderDetailApi(orderId: number) {
  return request.get<undefined, OrderDetailVO>(`/order/detail/${orderId}`);
}

/** 用户取消订单（application/json body） */
export function cancelOrderApi(orderId: number) {
  return request.post<undefined, void>("/order/cancelUserOrder", { orderId });
}

/** 用户确认收货（application/json body） */
export function confirmReceiveOrderApi(orderId: number) {
  return request.post<undefined, void>("/order/confirmReceiveOrder", {
    orderId,
  });
}

/** 用户删除订单（application/json body） */
export function deleteOrderApi(orderId: number) {
  return request.post<undefined, void>("/order/deleteOrder", { orderId });
}

/** 申请退货 */
export function createReturnApplyApi(returnApply: unknown) {
  return request.post<undefined, void>("/returnApply/create", returnApply);
}

/* ======================== 收货地址接口 ======================== */

/** 获取收货地址列表 */
export function getAddressListApi() {
  return request.get<undefined, MemberReceiveAddress[]>("/member/address/list");
}

/** 获取收货地址详情 */
export function getAddressDetailApi(id: number) {
  return request.get<undefined, MemberReceiveAddress>(`/member/address/${id}`);
}

/** 添加收货地址 */
export function addAddressApi(address: MemberReceiveAddress) {
  return request.post<undefined, void>("/member/address/add", address);
}

/** 修改收货地址 */
export function updateAddressApi(id: number, address: MemberReceiveAddress) {
  return request.post<undefined, void>(`/member/address/update/${id}`, address);
}

/** 删除收货地址 */
export function deleteAddressApi(id: number) {
  return request.post<undefined, void>(`/member/address/delete/${id}`);
}

/* ======================== 会员优惠券接口 ======================== */

/** 领取指定优惠券 */
export function addCouponApi(couponId: number) {
  return request.post<undefined, void>(`/member/coupon/add/${couponId}`);
}

/** 会员优惠券列表 */
export function getCouponListApi(useStatus?: number) {
  return request.get<undefined, unknown[]>("/member/coupon/list", {
    params: { useStatus },
  });
}

/** 优惠券领取历史 */
export function getCouponHistoryApi(useStatus?: number) {
  return request.get<undefined, unknown[]>("/member/coupon/listHistory", {
    params: { useStatus },
  });
}

/** 获取当前商品相关优惠券 */
export function getCouponsByProductApi(productId: number) {
  return request.get<undefined, unknown[]>(
    `/member/coupon/listByProduct/${productId}`,
  );
}

/* ======================== 收藏与浏览记录 ======================== */

/** 添加商品收藏 */
export function addCollectionApi(productId: number) {
  return request.post<undefined, void>("/member/productCollection/add", {
    productId,
  });
}

/** 删除收藏 */
export function deleteCollectionApi(productId: number) {
  return request.post<undefined, void>(
    "/member/productCollection/delete",
    null,
    {
      params: { productId },
    },
  );
}

/** 收藏列表 */
export function getCollectionListApi(pageNum = 1, pageSize = 10) {
  return request.get<undefined, CommonPage<unknown>>(
    "/member/productCollection/list",
    { params: { pageNum, pageSize } },
  );
}

/** 清空收藏列表 */
export function clearCollectionApi() {
  return request.post<undefined, void>("/member/productCollection/clear");
}

/** 创建浏览记录 */
export function addReadHistoryApi(productId: number) {
  return request.post<undefined, void>("/member/readHistory/create", {
    productId,
  });
}

/** 浏览记录列表 */
export function getReadHistoryListApi(pageNum = 1, pageSize = 10) {
  return request.get<undefined, CommonPage<unknown>>(
    "/member/readHistory/list",
    {
      params: { pageNum, pageSize },
    },
  );
}

/** 清空浏览记录 */
export function clearReadHistoryApi() {
  return request.post<undefined, void>("/member/readHistory/clear");
}

/* ======================== 会员关注品牌 ======================== */

/** 添加品牌关注 */
export function addAttentionApi(brandId: number) {
  return request.post<undefined, void>("/member/attention/add", { brandId });
}

/** 取消关注 */
export function deleteAttentionApi(brandId: number) {
  return request.post<undefined, void>("/member/attention/delete", null, {
    params: { brandId },
  });
}

/** 关注列表 */
export function getAttentionListApi(pageNum = 1, pageSize = 10) {
  return request.get<undefined, CommonPage<unknown>>("/member/attention/list", {
    params: { pageNum, pageSize },
  });
}

/** 清空关注列表 */
export function clearAttentionApi() {
  return request.post<undefined, void>("/member/attention/clear");
}
