// 后端 API 端点配置（单一事实来源）
//
// 对应 api-interfaces.html 中定义的 mall-swarm 后端接口。
// 路径即为后端 Controller 暴露的真实路径；由 HttpConfig.BASE_URL 统一拼接前缀
// （开发环境 "/api" 经 Vite proxy 转发到网关；生产环境注入实际地址）。
//
// 约定：
// - 路径中以 ":name" 标记的段为路径参数，调用时由 request 层替换。
// - 所有端点均返回 CommonResult<T>，由响应拦截器统一拆包为 T。

/** HTTP 方法 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/** 端点描述 */
export interface Endpoint {
  /** HTTP 方法 */
  method: HttpMethod;
  /** 路径（可含 ":param" 占位符） */
  path: string;
  /** 描述（便于排查与文档化） */
  desc?: string;
}

/** 把带 ":param" 占位的路径用 params 填充 */
export function buildPath(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/:(\w+)/g, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key)
      ? encodeURIComponent(String(params[key]))
      : `:${key}`,
  );
}

/* ======================== mall-portal 前台商城 ======================== */

export const PORTAL_ENDPOINTS = {
  // 会员 SSO
  ssoRegister: { method: "POST", path: "/sso/register", desc: "会员注册" },
  ssoLogin: { method: "POST", path: "/sso/login", desc: "会员登录" },
  ssoInfo: { method: "GET", path: "/sso/info", desc: "获取会员信息" },
  ssoLogout: { method: "POST", path: "/sso/logout", desc: "登出" },
  ssoGetAuthCode: {
    method: "GET",
    path: "/sso/getAuthCode",
    desc: "获取验证码",
  },
  ssoUpdatePassword: {
    method: "POST",
    path: "/sso/updatePassword",
    desc: "修改密码",
  },

  // 收货地址
  addressList: { method: "GET", path: "/member/address/list", desc: "收货地址列表" },
  addressAdd: { method: "POST", path: "/member/address/add", desc: "添加收货地址" },
  addressUpdate: {
    method: "POST",
    path: "/member/address/update/:id",
    desc: "修改收货地址",
  },
  addressDelete: {
    method: "POST",
    path: "/member/address/delete/:id",
    desc: "删除收货地址",
  },
  addressDetail: {
    method: "GET",
    path: "/member/address/:id",
    desc: "收货地址详情",
  },

  // 优惠券
  couponAdd: {
    method: "POST",
    path: "/member/coupon/add/:couponId",
    desc: "领取优惠券",
  },
  couponList: { method: "GET", path: "/member/coupon/list", desc: "会员优惠券列表" },
  couponListHistory: {
    method: "GET",
    path: "/member/coupon/listHistory",
    desc: "优惠券历史",
  },
  couponListByProduct: {
    method: "GET",
    path: "/member/coupon/listByProduct/:productId",
    desc: "商品相关优惠券",
  },

  // 前台商品
  productSearch: {
    method: "GET",
    path: "/product/search",
    desc: "综合搜索、筛选、排序",
  },
  productCategoryTree: {
    method: "GET",
    path: "/product/categoryTreeList",
    desc: "商品分类树",
  },
  productDetail: {
    method: "GET",
    path: "/product/detail/:id",
    desc: "前台商品详情",
  },

  // 前台品牌
  brandRecommendList: {
    method: "GET",
    path: "/brand/recommendList",
    desc: "推荐品牌",
  },
  brandDetail: {
    method: "GET",
    path: "/brand/detail/:brandId",
    desc: "品牌详情",
  },
  brandProductList: {
    method: "GET",
    path: "/brand/productList",
    desc: "品牌相关商品",
  },

  // 购物车
  cartAdd: { method: "POST", path: "/cart/add", desc: "加入购物车" },
  cartList: { method: "GET", path: "/cart/list", desc: "购物车列表" },
  cartListPromotion: {
    method: "GET",
    path: "/cart/list/promotion",
    desc: "购物车列表(含促销)",
  },
  cartUpdateQty: {
    method: "GET",
    path: "/cart/update/quantity",
    desc: "修改购物车数量",
  },
  cartUpdateAttr: {
    method: "POST",
    path: "/cart/update/attr",
    desc: "修改购物车规格",
  },
  cartDelete: { method: "POST", path: "/cart/delete", desc: "删除购物车项" },
  cartClear: { method: "POST", path: "/cart/clear", desc: "清空购物车" },

  // 订单
  orderGenerateConfirm: {
    method: "POST",
    path: "/order/generateConfirmOrder",
    desc: "生成确认单",
  },
  orderGenerate: { method: "POST", path: "/order/generateOrder", desc: "生成订单" },
  orderPaySuccess: {
    method: "POST",
    path: "/order/paySuccess",
    desc: "支付成功回调",
  },
  orderList: { method: "GET", path: "/order/list", desc: "用户订单列表" },
  orderDetail: {
    method: "GET",
    path: "/order/detail/:orderId",
    desc: "订单详情",
  },
  orderCancelUser: {
    method: "POST",
    path: "/order/cancelUserOrder",
    desc: "用户取消订单",
  },
  orderConfirmReceive: {
    method: "POST",
    path: "/order/confirmReceiveOrder",
    desc: "用户确认收货",
  },
  orderDelete: {
    method: "POST",
    path: "/order/deleteOrder",
    desc: "用户删除订单",
  },
  orderReturnApply: {
    method: "POST",
    path: "/returnApply/create",
    desc: "申请退货",
  },

  // 收藏与浏览记录
  collectionAdd: {
    method: "POST",
    path: "/member/productCollection/add",
    desc: "添加商品收藏",
  },
  collectionDelete: {
    method: "POST",
    path: "/member/productCollection/delete",
    desc: "删除收藏",
  },
  collectionList: {
    method: "GET",
    path: "/member/productCollection/list",
    desc: "收藏列表",
  },
  collectionClear: {
    method: "POST",
    path: "/member/productCollection/clear",
    desc: "清空收藏",
  },
  readHistoryCreate: {
    method: "POST",
    path: "/member/readHistory/create",
    desc: "创建浏览记录",
  },
  readHistoryList: {
    method: "GET",
    path: "/member/readHistory/list",
    desc: "浏览记录列表",
  },
  readHistoryClear: {
    method: "POST",
    path: "/member/readHistory/clear",
    desc: "清空浏览记录",
  },

  // 首页内容
  homeContent: { method: "GET", path: "/home/content", desc: "首页内容聚合" },
  homeRecommendProduct: {
    method: "GET",
    path: "/home/recommendProductList",
    desc: "推荐商品",
  },
  homeProductCate: {
    method: "GET",
    path: "/home/productCateList/:parentId",
    desc: "首页商品分类",
  },
  homeSubject: { method: "GET", path: "/home/subjectList", desc: "专题列表" },
  homeHotProduct: {
    method: "GET",
    path: "/home/hotProductList",
    desc: "人气推荐",
  },
  homeNewProduct: {
    method: "GET",
    path: "/home/newProductList",
    desc: "新品推荐",
  },

  // 支付宝
  alipayPay: { method: "GET", path: "/alipay/pay", desc: "支付宝电脑网站支付" },
  alipayWebPay: {
    method: "GET",
    path: "/alipay/webPay",
    desc: "支付宝手机网站支付",
  },
  alipayQuery: { method: "GET", path: "/alipay/query", desc: "支付宝交易查询" },
} satisfies Record<string, Endpoint>;

/* ======================== mall-admin 后台管理 ======================== */

export const ADMIN_ENDPOINTS = {
  // 后台用户
  adminRegister: { method: "POST", path: "/admin/register", desc: "用户注册" },
  adminLogin: { method: "POST", path: "/admin/login", desc: "登录返回token" },
  adminInfo: { method: "GET", path: "/admin/info", desc: "当前登录用户信息" },
  adminLogout: { method: "POST", path: "/admin/logout", desc: "登出" },
  adminList: { method: "GET", path: "/admin/list", desc: "分页用户列表" },
  adminDetail: { method: "GET", path: "/admin/:id", desc: "用户详情" },
  adminUpdate: { method: "POST", path: "/admin/update/:id", desc: "修改用户" },
  adminUpdatePassword: {
    method: "POST",
    path: "/admin/updatePassword",
    desc: "修改密码",
  },
  adminDelete: { method: "POST", path: "/admin/delete/:id", desc: "删除用户" },
  adminUpdateStatus: {
    method: "POST",
    path: "/admin/updateStatus/:id",
    desc: "修改帐号状态",
  },
  adminAssignRole: {
    method: "POST",
    path: "/admin/role/update",
    desc: "给用户分配角色",
  },
  adminRoles: {
    method: "GET",
    path: "/admin/role/:adminId",
    desc: "获取用户角色",
  },

  // 角色
  roleCreate: { method: "POST", path: "/role/create", desc: "添加角色" },
  roleUpdate: { method: "POST", path: "/role/update/:id", desc: "修改角色" },
  roleDelete: { method: "POST", path: "/role/delete", desc: "批量删除角色" },
  roleListAll: { method: "GET", path: "/role/listAll", desc: "所有角色" },
  roleList: { method: "GET", path: "/role/list", desc: "分页角色列表" },
  roleUpdateStatus: {
    method: "POST",
    path: "/role/updateStatus/:id",
    desc: "修改角色状态",
  },
  roleListMenu: {
    method: "GET",
    path: "/role/listMenu/:roleId",
    desc: "角色相关菜单",
  },
  roleListResource: {
    method: "GET",
    path: "/role/listResource/:roleId",
    desc: "角色相关资源",
  },
  roleAllocMenu: { method: "POST", path: "/role/allocMenu", desc: "分配菜单" },
  roleAllocResource: {
    method: "POST",
    path: "/role/allocResource",
    desc: "分配资源",
  },

  // 商品
  productCreate: { method: "POST", path: "/product/create", desc: "创建商品" },
  productUpdateInfo: {
    method: "GET",
    path: "/product/updateInfo/:id",
    desc: "商品编辑信息",
  },
  productUpdate: {
    method: "POST",
    path: "/product/update/:id",
    desc: "更新商品",
  },
  productList: { method: "GET", path: "/product/list", desc: "查询商品" },
  productSimpleList: {
    method: "GET",
    path: "/product/simpleList",
    desc: "商品模糊查询",
  },
  productUpdateVerifyStatus: {
    method: "POST",
    path: "/product/update/verifyStatus",
    desc: "批量修改审核状态",
  },
  productUpdatePublishStatus: {
    method: "POST",
    path: "/product/update/publishStatus",
    desc: "批量上下架",
  },
  productUpdateRecommendStatus: {
    method: "POST",
    path: "/product/update/recommendStatus",
    desc: "批量推荐商品",
  },
  productUpdateNewStatus: {
    method: "POST",
    path: "/product/update/newStatus",
    desc: "批量设为新品",
  },
  productUpdateDeleteStatus: {
    method: "POST",
    path: "/product/update/deleteStatus",
    desc: "批量修改删除状态",
  },

  // 商品分类
  productCategoryCreate: {
    method: "POST",
    path: "/productCategory/create",
    desc: "添加产品分类",
  },
  productCategoryUpdate: {
    method: "POST",
    path: "/productCategory/update/:id",
    desc: "修改商品分类",
  },
  productCategoryList: {
    method: "GET",
    path: "/productCategory/list/:parentId",
    desc: "分页查询商品分类",
  },
  productCategoryDetail: {
    method: "GET",
    path: "/productCategory/:id",
    desc: "商品分类详情",
  },
  productCategoryDelete: {
    method: "POST",
    path: "/productCategory/delete/:id",
    desc: "删除商品分类",
  },
  productCategoryWithChildren: {
    method: "GET",
    path: "/productCategory/list/withChildren",
    desc: "所有一级分类及子分类",
  },

  // 品牌
  brandListAll: { method: "GET", path: "/brand/listAll", desc: "全部品牌" },
  brandCreate: { method: "POST", path: "/brand/create", desc: "添加品牌" },
  brandUpdate: { method: "POST", path: "/brand/update/:id", desc: "更新品牌" },
  brandDelete: { method: "GET", path: "/brand/delete/:id", desc: "删除品牌" },
  brandList: { method: "GET", path: "/brand/list", desc: "分页品牌列表" },
  brandDetail: { method: "GET", path: "/brand/:id", desc: "品牌详情" },

  // 订单
  orderList: { method: "GET", path: "/order/list", desc: "查询订单" },
  orderUpdateDelivery: {
    method: "POST",
    path: "/order/update/delivery",
    desc: "批量发货",
  },
  orderUpdateClose: {
    method: "POST",
    path: "/order/update/close",
    desc: "批量关闭订单",
  },
  orderDelete: { method: "POST", path: "/order/delete", desc: "批量删除订单" },
  orderDetail: { method: "GET", path: "/order/:id", desc: "订单详情" },
  orderUpdateReceiverInfo: {
    method: "POST",
    path: "/order/update/receiverInfo",
    desc: "修改收货人信息",
  },
  orderUpdateMoneyInfo: {
    method: "POST",
    path: "/order/update/moneyInfo",
    desc: "修改订单费用",
  },
  orderUpdateNote: {
    method: "POST",
    path: "/order/update/note",
    desc: "备注订单",
  },

  // 优惠券
  couponCreate: { method: "POST", path: "/coupon/create", desc: "添加优惠券" },
  couponDelete: {
    method: "POST",
    path: "/coupon/delete/:id",
    desc: "删除优惠券",
  },
  couponUpdate: {
    method: "POST",
    path: "/coupon/update/:id",
    desc: "修改优惠券",
  },
  couponList: { method: "GET", path: "/coupon/list", desc: "分页优惠券列表" },
  couponDetail: { method: "GET", path: "/coupon/:id", desc: "优惠券详情" },

  // 首页轮播广告
  homeAdvertiseCreate: {
    method: "POST",
    path: "/home/advertise/create",
    desc: "添加广告",
  },
  homeAdvertiseDelete: {
    method: "POST",
    path: "/home/advertise/delete",
    desc: "删除广告",
  },
  homeAdvertiseUpdateStatus: {
    method: "POST",
    path: "/home/advertise/update/status/:id",
    desc: "修改上下线状态",
  },
  homeAdvertiseDetail: {
    method: "GET",
    path: "/home/advertise/:id",
    desc: "广告详情",
  },
  homeAdvertiseUpdate: {
    method: "POST",
    path: "/home/advertise/update/:id",
    desc: "修改广告",
  },
  homeAdvertiseList: {
    method: "GET",
    path: "/home/advertise/list",
    desc: "分页查询广告",
  },

  // MinIO 文件上传
  minioUpload: { method: "POST", path: "/minio/upload", desc: "文件上传" },
  minioDelete: { method: "POST", path: "/minio/delete", desc: "文件删除" },
} satisfies Record<string, Endpoint>;

/* ======================== mall-ArticleSummary 文章汇总 ======================== */

export const ARTICLE_ENDPOINTS = {
  // 文章
  articleCreate: { method: "POST", path: "/article/create", desc: "创建文章" },
  articleUpdate: {
    method: "POST",
    path: "/article/update/:id",
    desc: "修改文章",
  },
  articleDelete: {
    method: "GET",
    path: "/article/delete/:id",
    desc: "删除指定文章",
  },
  articleDeleteBatch: {
    method: "POST",
    path: "/article/delete/batch",
    desc: "批量删除文章",
  },
  articleList: { method: "GET", path: "/article/list", desc: "分页文章列表" },
  articleDetail: { method: "GET", path: "/article/:id", desc: "文章详情" },
  articleUpdateStatus: {
    method: "POST",
    path: "/article/update/status",
    desc: "批量修改状态",
  },

  // 新闻
  newsCreate: { method: "POST", path: "/news/create", desc: "创建新闻" },
  newsUpdate: { method: "POST", path: "/news/update/:id", desc: "修改新闻" },
  newsDelete: { method: "GET", path: "/news/delete/:id", desc: "删除新闻" },
  newsDeleteBatch: {
    method: "POST",
    path: "/news/delete/batch",
    desc: "批量删除新闻",
  },
  newsList: { method: "GET", path: "/news/list", desc: "分页新闻列表" },
  newsDetail: { method: "GET", path: "/news/:id", desc: "新闻详情" },
  newsUpdateStatus: {
    method: "POST",
    path: "/news/update/status",
    desc: "批量修改状态",
  },

  // 论文
  paperCreate: { method: "POST", path: "/paper/create", desc: "创建论文" },
  paperUpdate: { method: "POST", path: "/paper/update/:id", desc: "修改论文" },
  paperDelete: { method: "GET", path: "/paper/delete/:id", desc: "删除论文" },
  paperDeleteBatch: {
    method: "POST",
    path: "/paper/delete/batch",
    desc: "批量删除论文",
  },
  paperList: { method: "GET", path: "/paper/list", desc: "分页论文列表" },
  paperDetail: { method: "GET", path: "/paper/:id", desc: "论文详情" },
  paperUpdateStatus: {
    method: "POST",
    path: "/paper/update/status",
    desc: "批量修改状态",
  },

  // 会员
  articleMemberCreate: {
    method: "POST",
    path: "/member/create",
    desc: "创建会员",
  },
  articleMemberUpdate: {
    method: "POST",
    path: "/member/update/:id",
    desc: "修改会员",
  },
  articleMemberDelete: {
    method: "GET",
    path: "/member/delete/:id",
    desc: "删除指定会员",
  },
  articleMemberDeleteBatch: {
    method: "POST",
    path: "/member/delete/batch",
    desc: "批量删除会员",
  },
  articleMemberList: {
    method: "GET",
    path: "/member/list",
    desc: "分页查询会员列表",
  },
  articleMemberDetail: {
    method: "GET",
    path: "/member/:id",
    desc: "根据ID查询会员",
  },
  articleMemberUpdateStatus: {
    method: "POST",
    path: "/member/update/status",
    desc: "批量修改状态",
  },
} satisfies Record<string, Endpoint>;

/* ======================== mall-search 搜索系统 ======================== */

export const SEARCH_ENDPOINTS = {
  esImportAll: {
    method: "POST",
    path: "/esProduct/importAll",
    desc: "导入所有商品到ES",
  },
  esDelete: {
    method: "GET",
    path: "/esProduct/delete/:id",
    desc: "根据id删除商品",
  },
  esDeleteBatch: {
    method: "POST",
    path: "/esProduct/delete/batch",
    desc: "批量删除商品",
  },
  esCreate: {
    method: "POST",
    path: "/esProduct/create/:id",
    desc: "根据id创建商品",
  },
  esSearchSimple: {
    method: "GET",
    path: "/esProduct/search/simple",
    desc: "简单搜索",
  },
  esSearch: {
    method: "GET",
    path: "/esProduct/search",
    desc: "综合搜索、筛选、排序",
  },
  esRecommend: {
    method: "GET",
    path: "/esProduct/recommend/:id",
    desc: "根据商品id推荐商品",
  },
  esSearchRelate: {
    method: "GET",
    path: "/esProduct/search/relate",
    desc: "相关品牌、分类及筛选属性",
  },
} satisfies Record<string, Endpoint>;

/* ======================== mall-auth 统一认证 ======================== */

export const AUTH_ENDPOINTS = {
  authLogin: {
    method: "POST",
    path: "/auth/login",
    desc: "统一登录返回token",
  },
} satisfies Record<string, Endpoint>;

/** 全部端点集合（便于遍历校验） */
export const ALL_ENDPOINTS = {
  ...PORTAL_ENDPOINTS,
  ...ADMIN_ENDPOINTS,
  ...ARTICLE_ENDPOINTS,
  ...SEARCH_ENDPOINTS,
  ...AUTH_ENDPOINTS,
} as const;
