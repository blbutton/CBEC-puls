// mall-admin 后台管理 API 服务
// 对应后端 mall-admin 模块：后台用户、角色、商品、品牌、订单、优惠券、首页广告、文件上传等

import request from "@/utils/request";
import type {
  AdminLoginParam,
  AdminLoginResult,
  AdminOrderVO,
  AdminProductVO,
  AdminRegisterParam,
  AdminVO,
  BrandParam,
  BrandVO,
  CommonPage,
  CouponVO,
  HomeAdvertiseVO,
  OrderQueryParam,
  ProductCategoryVO,
  ProductQueryParam,
  RoleParam,
  RoleVO,
  UpdateAdminPasswordParam,
  UploadResult,
} from "@/types/api";

/* ======================== 后台用户管理 ======================== */

/** 用户注册 */
export function adminRegisterApi(param: AdminRegisterParam) {
  return request.post<AdminRegisterParam, void>("/admin/register", param);
}

/** 登录以后返回 token */
export function adminLoginApi(param: AdminLoginParam) {
  return request.post<AdminLoginParam, AdminLoginResult>("/admin/login", param);
}

/** 获取当前登录用户信息 */
export function getAdminInfoApi() {
  return request.get<undefined, AdminVO>("/admin/info");
}

/** 登出 */
export function adminLogoutApi() {
  return request.post<undefined, void>("/admin/logout");
}

/** 根据用户名或姓名分页获取用户列表 */
export function getAdminListApi(params: {
  keyword?: string;
  pageSize?: number;
  pageNum?: number;
}) {
  return request.get<undefined, CommonPage<AdminVO>>("/admin/list", {
    params,
  });
}

/** 获取指定用户信息 */
export function getAdminDetailApi(id: number) {
  return request.get<undefined, AdminVO>(`/admin/${id}`);
}

/** 修改指定用户信息 */
export function updateAdminApi(id: number, admin: Partial<AdminVO>) {
  return request.post<Partial<AdminVO>, void>(`/admin/update/${id}`, admin);
}

/** 修改指定用户密码 */
export function updateAdminPasswordApi(param: UpdateAdminPasswordParam) {
  return request.post<UpdateAdminPasswordParam, void>(
    "/admin/updatePassword",
    param,
  );
}

/** 删除指定用户信息 */
export function deleteAdminApi(id: number) {
  return request.post<undefined, void>(`/admin/delete/${id}`);
}

/** 修改帐号状态（0-禁用 1-启用） */
export function updateAdminStatusApi(id: number, status: number) {
  return request.post<undefined, void>(`/admin/updateStatus/${id}`, null, {
    params: { status },
  });
}

/** 给用户分配角色 */
export function assignAdminRoleApi(adminId: number, roleIds: number[]) {
  return request.post<undefined, void>("/admin/role/update", null, {
    params: { adminId, roleIds: roleIds.join(",") },
  });
}

/** 获取指定用户的角色 */
export function getAdminRolesApi(adminId: number) {
  return request.get<undefined, RoleVO[]>(`/admin/role/${adminId}`);
}

/* ======================== 角色管理 ======================== */

/** 添加角色 */
export function createRoleApi(role: RoleParam) {
  return request.post<RoleParam, void>("/role/create", role);
}

/** 修改角色 */
export function updateRoleApi(id: number, role: RoleParam) {
  return request.post<RoleParam, void>(`/role/update/${id}`, role);
}

/** 批量删除角色 */
export function deleteRolesApi(ids: number[]) {
  return request.post<undefined, void>("/role/delete", null, {
    params: { ids: ids.join(",") },
  });
}

/** 获取所有角色 */
export function listAllRolesApi() {
  return request.get<undefined, RoleVO[]>("/role/listAll");
}

/** 根据角色名称分页获取角色列表 */
export function listRolesApi(params: {
  keyword?: string;
  pageSize?: number;
  pageNum?: number;
}) {
  return request.get<undefined, CommonPage<RoleVO>>("/role/list", { params });
}

/** 修改角色状态 */
export function updateRoleStatusApi(id: number, status: number) {
  return request.post<undefined, void>(`/role/updateStatus/${id}`, null, {
    params: { status },
  });
}

/* ======================== 商品管理 ======================== */

/** 创建商品 */
export function createProductApi(productParam: unknown) {
  return request.post<unknown, void>("/product/create", productParam);
}

/** 根据商品 id 获取商品编辑信息 */
export function getProductUpdateInfoApi(id: number) {
  return request.get<unknown, unknown>(`/product/updateInfo/${id}`);
}

/** 更新商品 */
export function updateProductApi(id: number, productParam: unknown) {
  return request.post<unknown, void>(`/product/update/${id}`, productParam);
}

/** 查询商品 */
export function listProductsApi(params: ProductQueryParam) {
  return request.get<undefined, CommonPage<AdminProductVO>>("/product/list", {
    params,
  });
}

/** 根据商品名称或货号模糊查询 */
export function simpleListProductsApi(keyword: string) {
  return request.get<undefined, AdminProductVO[]>("/product/simpleList", {
    params: { keyword },
  });
}

/** 批量修改审核状态 */
export function updateProductVerifyStatusApi(
  ids: number[],
  verifyStatus: number,
  detail?: string,
) {
  return request.post<undefined, void>("/product/update/verifyStatus", null, {
    params: {
      ids: ids.join(","),
      verifyStatus,
      detail,
    },
  });
}

/** 批量上下架 */
export function updateProductPublishStatusApi(
  ids: number[],
  publishStatus: number,
) {
  return request.post<undefined, void>(
    "/product/update/publishStatus",
    null,
    { params: { ids: ids.join(","), publishStatus } },
  );
}

/** 批量推荐商品 */
export function updateProductRecommendStatusApi(
  ids: number[],
  recommendStatus: number,
) {
  return request.post<undefined, void>(
    "/product/update/recommendStatus",
    null,
    { params: { ids: ids.join(","), recommendStatus } },
  );
}

/** 批量设为新品 */
export function updateProductNewStatusApi(ids: number[], newStatus: number) {
  return request.post<undefined, void>("/product/update/newStatus", null, {
    params: { ids: ids.join(","), newStatus },
  });
}

/** 批量修改删除状态 */
export function updateProductDeleteStatusApi(
  ids: number[],
  deleteStatus: number,
) {
  return request.post<undefined, void>("/product/update/deleteStatus", null, {
    params: { ids: ids.join(","), deleteStatus },
  });
}

/* ======================== 商品分类管理 ======================== */

/** 分页查询商品分类 */
export function listProductCategoriesApi(
  parentId: number,
  pageNum = 1,
  pageSize = 10,
) {
  return request.get<undefined, CommonPage<ProductCategoryVO>>(
    `/productCategory/list/${parentId}`,
    { params: { pageNum, pageSize } },
  );
}

/** 查询所有一级分类及子分类 */
export function listProductCategoriesWithChildrenApi() {
  return request.get<undefined, ProductCategoryVO[]>(
    "/productCategory/list/withChildren",
  );
}

/** 根据 id 获取商品分类 */
export function getProductCategoryApi(id: number) {
  return request.get<undefined, ProductCategoryVO>(`/productCategory/${id}`);
}

/** 添加产品分类 */
export function createProductCategoryApi(param: unknown) {
  return request.post<unknown, void>("/productCategory/create", param);
}

/** 修改商品分类 */
export function updateProductCategoryApi(id: number, param: unknown) {
  return request.post<unknown, void>(`/productCategory/update/${id}`, param);
}

/** 删除商品分类 */
export function deleteProductCategoryApi(id: number) {
  return request.post<undefined, void>(`/productCategory/delete/${id}`);
}

/* ======================== 品牌管理 ======================== */

/** 获取全部品牌列表 */
export function listAllBrandsApi() {
  return request.get<undefined, BrandVO[]>("/brand/listAll");
}

/** 根据品牌名称分页获取品牌列表 */
export function listBrandsApi(params: {
  keyword?: string;
  pageNum?: number;
  pageSize?: number;
}) {
  return request.get<undefined, CommonPage<BrandVO>>("/brand/list", { params });
}

/** 根据编号查询品牌信息 */
export function getBrandApi(id: number) {
  return request.get<undefined, BrandVO>(`/brand/${id}`);
}

/** 添加品牌 */
export function createBrandApi(param: BrandParam) {
  return request.post<BrandParam, void>("/brand/create", param);
}

/** 更新品牌 */
export function updateBrandApi(id: number, param: BrandParam) {
  return request.post<BrandParam, void>(`/brand/update/${id}`, param);
}

/** 删除品牌 */
export function deleteBrandApi(id: number) {
  return request.get<undefined, void>(`/brand/delete/${id}`);
}

/* ======================== 订单管理 ======================== */

/** 查询订单 */
export function listOrdersApi(params: OrderQueryParam) {
  return request.get<undefined, CommonPage<AdminOrderVO>>("/order/list", {
    params,
  });
}

/** 获取订单详情 */
export function getOrderApi(id: number) {
  return request.get<undefined, AdminOrderVO>(`/order/${id}`);
}

/** 批量发货 */
export function batchDeliveryApi(
  deliveryParamList: Array<{ orderId: number; deliveryCompany: string; deliverySn: string }>,
) {
  return request.post<unknown, void>(
    "/order/update/delivery",
    deliveryParamList,
  );
}

/** 批量关闭订单 */
export function batchCloseOrdersApi(ids: number[], note?: string) {
  return request.post<undefined, void>("/order/update/close", null, {
    params: { ids: ids.join(","), note },
  });
}

/** 批量删除订单 */
export function batchDeleteOrdersApi(ids: number[]) {
  return request.post<undefined, void>("/order/delete", null, {
    params: { ids: ids.join(",") },
  });
}

/** 备注订单 */
export function updateOrderNoteApi(id: number, note: string, status: number) {
  return request.post<undefined, void>("/order/update/note", null, {
    params: { id, note, status },
  });
}

/* ======================== 优惠券管理 ======================== */

/** 添加优惠券 */
export function createCouponApi(couponParam: unknown) {
  return request.post<unknown, void>("/coupon/create", couponParam);
}

/** 删除优惠券 */
export function deleteCouponApi(id: number) {
  return request.post<undefined, void>(`/coupon/delete/${id}`);
}

/** 修改优惠券 */
export function updateCouponApi(id: number, couponParam: unknown) {
  return request.post<unknown, void>(`/coupon/update/${id}`, couponParam);
}

/** 分页获取优惠券列表 */
export function listCouponsApi(params: {
  name?: string;
  type?: number;
  pageNum?: number;
  pageSize?: number;
}) {
  return request.get<undefined, CommonPage<CouponVO>>("/coupon/list", {
    params,
  });
}

/** 获取单个优惠券的详细信息 */
export function getCouponApi(id: number) {
  return request.get<undefined, CouponVO>(`/coupon/${id}`);
}

/* ======================== 首页轮播广告管理 ======================== */

/** 添加广告 */
export function createHomeAdvertiseApi(advertise: unknown) {
  return request.post<unknown, void>("/home/advertise/create", advertise);
}

/** 删除广告 */
export function deleteHomeAdvertiseApi(ids: number[]) {
  return request.post<undefined, void>("/home/advertise/delete", null, {
    params: { ids: ids.join(",") },
  });
}

/** 修改上下线状态 */
export function updateHomeAdvertiseStatusApi(id: number, status: number) {
  return request.post<undefined, void>(
    `/home/advertise/update/status/${id}`,
    null,
    { params: { status } },
  );
}

/** 获取广告详情 */
export function getHomeAdvertiseApi(id: number) {
  return request.get<undefined, HomeAdvertiseVO>(`/home/advertise/${id}`);
}

/** 修改广告 */
export function updateHomeAdvertiseApi(id: number, advertise: unknown) {
  return request.post<unknown, void>(
    `/home/advertise/update/${id}`,
    advertise,
  );
}

/** 分页查询广告 */
export function listHomeAdvertisesApi(params: {
  name?: string;
  type?: number;
  endTime?: string;
  pageNum?: number;
  pageSize?: number;
}) {
  return request.get<undefined, CommonPage<HomeAdvertiseVO>>(
    "/home/advertise/list",
    { params },
  );
}

/* ======================== MinIO 文件上传 ======================== */

/**
 * 文件上传
 * @param file File 对象
 * @returns 上传结果（含访问 URL）
 */
export function uploadFileApi(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return request.post<FormData, UploadResult>("/minio/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/** 文件删除 */
export function deleteFileApi(objectName: string) {
  return request.post<undefined, void>("/minio/delete", null, {
    params: { objectName },
  });
}
