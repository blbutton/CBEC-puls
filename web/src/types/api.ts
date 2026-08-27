// mall-swarm 后端统一响应/分页类型

import type { LoginOutcome } from "@/store/auth";
import type {
  CartItem,
  ContentItem,
  ContentStatus,
  Permission,
  Product,
  Role,
  SafeUser,
  User,
} from "./index";

/** 后端统一响应体 CommonResult<T> */
export interface CommonResult<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** 后端统一分页响应 CommonPage<T> */
export interface CommonPage<T = unknown> {
  pageNum: number;
  pageSize: number;
  total: number;
  totalPage: number;
  list: T[];
}

/** 通用分页查询参数 */
export interface PageParam {
  pageNum?: number;
  pageSize?: number;
}

/** 通用查询参数（带关键词） */
export interface KeywordPageParam extends PageParam {
  keyword?: string;
}

/* ======================== 类型定义 ======================== */

/** 文章状态：0-草稿 1-已发布 */
export type ArticleStatus = 0 | 1;

/** 文章实体 */
export interface ArticleVO {
  id: number;
  title: string;
  author: string;
  summary: string;
  coverImage: string;
  content: string;
  categoryId: number;
  categoryName: string;
  status: ArticleStatus;
  viewCount: number;
  sort: number;
  createTime: string;
  updateTime: string;
}

/** 新闻实体 */
export interface NewsVO {
  id: number;
  title: string;
  author: string;
  summary: string;
  coverImage: string;
  content: string;
  source: string;
  status: ArticleStatus;
  viewCount: number;
  sort: number;
  createTime: string;
  updateTime: string;
}

/** 论文实体 */
export interface PaperVO {
  id: number;
  title: string;
  authors: string;
  abstract: string;
  keywords: string;
  doi: string;
  journal: string;
  publishDate: string;
  pdfUrl: string;
  status: ArticleStatus;
  viewCount: number;
  sort: number;
  createTime: string;
  updateTime: string;
}

/** 文章汇总系统中的会员 */
export interface ArticleMemberVO {
  id: number;
  name: string;
  avatar: string;
  bio: string;
  title: string;
  organization: string;
  status: ArticleStatus;
  sort: number;
  createTime: string;
  updateTime: string;
}

/** 创建/更新文章参数 */
export interface ArticleForm {
  title: string;
  author: string;
  summary: string;
  coverImage: string;
  content: string;
  categoryId: number;
  status: ArticleStatus;
  sort?: number;
}

export interface NewsForm {
  title: string;
  author: string;
  summary: string;
  coverImage: string;
  content: string;
  source: string;
  status: ArticleStatus;
  sort?: number;
}

export interface PaperForm {
  title: string;
  authors: string;
  abstract: string;
  keywords: string;
  doi: string;
  journal: string;
  publishDate: string;
  pdfUrl: string;
  status: ArticleStatus;
  sort?: number;
}

export interface ArticleMemberForm {
  name: string;
  avatar: string;
  bio: string;
  title: string;
  organization: string;
  status: ArticleStatus;
  sort?: number;
}

/** 列表查询参数 */
export interface ArticleQueryParam extends PageParam {
  keyword?: string;
  status?: ArticleStatus;
}

export interface ApiResult {
  success: boolean;
  message: string;
}

export interface LoginResult extends ApiResult {
  user?: SafeUser;
  token?: string;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
}

export interface ContentQuery {
  keyword?: string;
  category?: string;
  status?: ContentStatus | "all";
  page?: number;
  pageSize?: number;
}

export interface ContentPage {
  list: ContentItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OnlineUser {
  id: string;
  username: string;
  ip: string;
  location: string;
  loginAt: string;
}

export interface CategoryStat {
  category: string;
  count: number;
}

/* ======================== 类型定义 ======================== */

/** 会员登录返回 */
export interface SsoLoginResult {
  token: string;
  tokenHead: string;
}

/** 会员信息 */
export interface MemberInfo {
  id: number;
  username: string;
  phone: string;
  icon: string;
  gender: number;
  birthday: string;
  city: string;
  job: string;
  personalizedSignature: string;
  integration: number;
}

/** 前台商品搜索结果项 */
export interface PortalProduct {
  id: number;
  name: string;
  subTitle: string;
  pic: string;
  price: number;
  originalPrice: number;
  productSn: string;
  stock: number;
  sale: number;
  productCategoryName: string;
  brandName: string;
  description: string;
  detailHtml: string;
  albumPics: string;
}

/** 商品分类树节点 */
export interface ProductCategoryNode {
  id: number;
  parentId: number;
  name: string;
  level: number;
  productCount: number;
  productUnit: string;
  children?: ProductCategoryNode[];
}

/** 购物车项 */
export interface CartItemParam {
  id?: number;
  productId: number;
  productSkuId?: number;
  quantity: number;
  productAttr?: string;
}

/** 后端购物车项（含商品快照） */
export interface CartItemVO extends CartItemParam {
  productName: string;
  productPic: string;
  productSubTitle: string;
  productSkuCode: string;
  productCategoryId: number;
  productBrand: string;
  productAttrJson: string;
  price: number;
}

/** 首页内容聚合 */
export interface HomeContent {
  advertiseList: HomeAdvertise[];
  brandList: HomeBrand[];
  homeFlashPromotion: unknown;
  newProductList: PortalProduct[];
  hotProductList: PortalProduct[];
  subjectList: HomeSubject[];
}

export interface HomeAdvertise {
  id: number;
  name: string;
  pic: string;
  url: string;
  type: number;
  startTime: string;
  endTime: string;
  status: number;
  sort: number;
  note: string;
}

export interface HomeBrand {
  id: number;
  name: string;
  bigPic: string;
  showStatus: number;
  productCount: number;
}

export interface HomeSubject {
  id: number;
  name: string;
  description: string;
  showStatus: number;
  frontName: string;
  categoryName: string;
}

/** 订单生成参数 */
export interface OrderParam {
  memberReceiveAddressId: number;
  couponId?: number;
  useIntegration?: number;
  payType: number;
}

/** 订单列表项 */
export interface OrderListItem {
  id: number;
  orderSn: string;
  status: number;
  totalAmount: number;
  payType: number;
  createTime: string;
  memberUsername: string;
  orderItemList: OrderItemVO[];
}

export interface OrderItemVO {
  id: number;
  productId: number;
  productName: string;
  productPic: string;
  productPrice: number;
  productQuantity: number;
  productSkuId: number;
  productSkuCode: string;
}

/** 收货地址 */
export interface MemberReceiveAddress {
  id?: number;
  name: string;
  phoneNumber: string;
  defaultStatus: number;
  postCode: string;
  province: string;
  city: string;
  region: string;
  detailAddress: string;
}

export interface UserQuery {
  keyword?: string;
  status?: "active" | "disabled" | "all";
  page?: number;
  pageSize?: number;
}

export interface UserPage {
  list: User[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserForm {
  username: string;
  email: string;
  password: string;
  roles: Role[];
  status: "active" | "disabled";
  avatar?: string;
}

export interface ContentForm {
  title: string;
  category: string;
  author: string;
  cover?: string;
  excerpt: string;
  content: string;
  status: ContentStatus;
}

export interface MetricHistory {
  labels: string[];
  series: { name: string; data: number[] }[];
}

export interface AuthState {
  token: string | null;
  user: SafeUser | null;
  roles: Role[];
  permissions: Permission[];
  rememberMe: boolean;
  login: (
    username: string,
    password: string,
    remember: boolean,
  ) => Promise<LoginOutcome>;
  register: (form: RegisterForm) => Promise<LoginOutcome>;
  sendVerifyCode: (email: string) => Promise<LoginOutcome>;
  resetPassword: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<LoginOutcome>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  hasRole: (role: Role) => boolean;
  hasPermission: (perm: Permission) => boolean;
}

export interface CartState {
  items: CartItem[];

  /** 添加商品（已存在则数量+1，否则新建）。返回实际加入的数量 */
  add: (product: Product, qty?: number) => number;

  /** 删除指定 id 的商品 */
  remove: (id: string) => void;

  /** 更新指定 id 商品数量，<=0 会被移除 */
  updateQty: (id: string, qty: number) => void;

  /** 清空购物车 */
  clear: () => void;

  /** 总商品件数 */
  totalCount: () => number;

  /** 总金额（按现价计算） */
  totalPrice: () => number;

  /** 从后端同步购物车（登录后调用） */
  syncFromServer: () => Promise<void>;
}

/* ======================== 统一认证 mall-auth ======================== */

/** mall-auth 统一登录返回 */
export interface AuthLoginResult {
  token: string;
  tokenHead: string;
}

/** mall-auth 登录参数 */
export interface AuthLoginParam {
  clientId: string;
  username: string;
  password: string;
}

/* ======================== mall-admin 后台类型 ======================== */

/** 后台用户 */
export interface AdminVO {
  id: number;
  username: string;
  nickName: string;
  email: string;
  phone: string;
  icon: string;
  status: number;
  createTime: string;
  loginTime: string;
}

export interface AdminLoginParam {
  username: string;
  password: string;
}

export interface AdminLoginResult {
  token: string;
  tokenHead: string;
}

export interface AdminRegisterParam {
  username: string;
  password: string;
  icon?: string;
  email?: string;
  nickName?: string;
  note?: string;
}

export interface UpdateAdminPasswordParam {
  username: string;
  password: string;
  oldPassword: string;
}

/** 角色 */
export interface RoleVO {
  id: number;
  name: string;
  description: string;
  status: number;
  sort: number;
  createTime: string;
}

export interface RoleParam {
  name: string;
  description?: string;
  status?: number;
  sort?: number;
}

/** 资源 */
export interface ResourceVO {
  id: number;
  name: string;
  url: string;
  description: string;
  categoryId: number;
  createTime: string;
}

/** 菜单 */
export interface MenuVO {
  id: number;
  parentId: number;
  title: string;
  level: number;
  sort: number;
  name: string;
  icon: string;
  hidden: number;
  createTime: string;
  children?: MenuVO[];
}

/** 后台品牌 */
export interface BrandVO {
  id: number;
  name: string;
  firstLetter: string;
  sort: number;
  factoryStatus: number;
  showStatus: number;
  productCount: number;
  logo: string;
  bigPic: string;
}

export interface BrandParam {
  name: string;
  firstLetter: string;
  sort?: number;
  factoryStatus?: number;
  showStatus?: number;
  logo?: string;
  bigPic?: string;
}

/** 后台商品 */
export interface AdminProductVO {
  id: number;
  name: string;
  subTitle: string;
  pic: string;
  price: number;
  productSn: string;
  publishStatus: number;
  newStatus: number;
  recommandStatus: number;
  verifyStatus: number;
  sort: number;
  sale: number;
  stock: number;
  productCategoryName: string;
  brandName: string;
  description: string;
  createTime: string;
}

export interface ProductQueryParam extends PageParam {
  keyword?: string;
  brandId?: number;
  productCategoryId?: number;
  publishStatus?: number;
  verifyStatus?: number;
}

/** 商品分类 */
export interface ProductCategoryVO {
  id: number;
  parentId: number;
  name: string;
  level: number;
  productCount: number;
  productUnit: string;
  navStatus: number;
  showStatus: number;
  sort: number;
  children?: ProductCategoryVO[];
}

/** 优惠券 */
export interface CouponVO {
  id: number;
  name: string;
  type: number;
  useType: number;
  platform: number;
  count: number;
  amount: number;
  perLimit: number;
  minPoint: number;
  startTime: string;
  endTime: string;
  note: string;
}

/** 首页广告 */
export interface HomeAdvertiseVO {
  id: number;
  name: string;
  type: number;
  pic: string;
  url: string;
  startTime: string;
  endTime: string;
  status: number;
  sort: number;
  note: string;
}

/** 后台订单 */
export interface AdminOrderVO {
  id: number;
  orderSn: string;
  status: number;
  totalAmount: number;
  payType: number;
  freightAmount: number;
  payAmount: number;
  memberUsername: string;
  receiverName: string;
  receiverPhone: string;
  createTime: string;
  note: string;
}

export interface OrderQueryParam extends PageParam {
  orderSn?: string;
  status?: number;
  receiverKeyword?: string;
}

/** 文件上传返回 */
export interface UploadResult {
  url: string;
  name: string;
  objectName?: string;
}

/* ======================== mall-search 搜索类型 ======================== */

/** ES 商品（含搜索高亮信息） */
export interface EsProductVO {
  id: number;
  name: string;
  subTitle: string;
  pic: string;
  price: number;
  productSn: string;
  sale: number;
  productCategoryName: string;
  brandName: string;
  description: string;
  albumPics: string;
}

export interface EsSearchParam extends PageParam {
  keyword?: string;
  brandId?: number;
  productCategoryId?: number;
  sort?: number;
}

/** 搜索关联信息（品牌、分类、筛选属性） */
export interface EsSearchRelate {
  brandList: Array<{ id: number; name: string }>;
  productCategoryList: Array<{ id: number; name: string }>;
  attrList: unknown[];
}

/* ======================== 订单详情（前台） ======================== */

/** 前台订单详情 */
export interface OrderDetailVO extends OrderListItem {
  receiverName: string;
  receiverPhone: string;
  receiverPostCode: string;
  receiverDetailAddress: string;
  freightAmount: number;
  payAmount: number;
  note: string;
  couponAmount: number;
  integrationAmount: number;
  payType: number;
  status: number;
  orderType: number;
}
