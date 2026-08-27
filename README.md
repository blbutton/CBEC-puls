# CBEC-puls

> Cross-Border E-Commerce Plus — 基于 Spring Cloud 微服务架构的新一代跨境电商平台

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.14-brightgreen)](https://spring.io/projects/spring-boot)
[![Spring Cloud](https://img.shields.io/badge/Spring%20Cloud-2025.0.2-brightgreen)](https://spring.io/projects/spring-cloud)
[![Java](https://img.shields.io/badge/Java-17-orange)](https://adoptium.net/)

---

## 📋 目录

- [项目简介](#项目简介)
- [系统架构](#系统架构)
- [技术栈](#技术栈)
- [项目模块](#项目模块)
- [功能特性](#功能特性)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [部署说明](#部署说明)
- [目录结构](#目录结构)
- [开发规范](#开发规范)
- [许可证](#许可证)

---

## 项目简介

CBEC-puls 是一套成熟的企业级跨境电商微服务解决方案，基于 [mall-swarm](https://github.com/macrozheng/mall-swarm) 进行深度定制和升级。项目采用前后端分离架构，后端基于 Spring Boot 3.x + Spring Cloud 2025.x 微服务体系，集成 Sa-Token 权限认证、Elasticsearch 搜索引擎、Redis 分布式缓存、MinIO 对象存储等主流中间件，支持 Docker Compose 与 Kubernetes 双模式部署，满足从开发、测试到生产全生命周期的运维需求。

### 核心亮点

- **🚀 技术栈升级**：全面升级至 Spring Boot 3.5.x + Spring Cloud 2025.x，拥抱 Java 17 新特性
- **🔐 安全认证**：Sa-Token 替代 Spring Security，提供更简洁高效的权限认证方案（Redis + JWT）
- **📦 模块化设计**：9 大微服务模块，职责清晰，可独立部署与水平扩展
- **🔍 全文检索**：Elasticsearch 驱动的商品搜索引擎，支持聚合筛选与智能推荐
- **📊 可观测性**：集成 Spring Boot Admin 监控中心 + ELK 日志收集体系
- **☁️ 云原生就绪**：提供 Docker Compose 一键启动脚本与 Kubernetes Helm/Kustomize 部署清单
- **📝 API 文档**：Knife4j + SpringDoc OpenAPI 3.0 网关聚合文档，接口调试零成本
- **🧩 扩展能力**：新增文章摘要（ArticleSummary）模块，支持内容生态扩展

---

## 系统架构

### 微服务架构图

```
                        ┌─────────────────────┐
                        │     Nginx / CDN     │
                        └─────────┬───────────┘
                                  │
                        ┌─────────▼───────────┐
                        │    mall-gateway     │  ◄─── 服务网关 (限流/鉴权/路由)
                        │    (Sa-Token 鉴权)   │
                        └─────────┬───────────┘
                                  │
           ┌──────────┬───────────┼───────────┬──────────┐
           │          │           │           │          │
     ┌─────▼────┐ ┌──▼─────┐ ┌───▼────┐ ┌────▼────┐ ┌──▼──────────┐
     │mall-admin│ │mall-auth│ │mall-   │ │mall-    │ │mall-        │
     │ 后台管理  │ │ 认证中心 │ │portal │ │search  │ │ArticleSummary│
     └─────┬────┘ └─────────┘ │ 前台商城│ │ 搜索服务│ │ 文章摘要    │
           │                  └─────────┘ └─────────┘ └────────────┘
           │
     ┌─────▼─────────────────────────────────────────────────┐
     │                    mall-common (公共模块)               │
     │    CommonResult / GlobalException / RedisService ...  │
     └─────┬─────────────────────────────────────────────────┘
           │
     ┌─────▼─────────────────────────────────────────────────┐
     │                    mall-mbg (持久层)                   │
     │    MyBatis Mapper / Model / Generator 代码生成         │
     └─────┬─────────────────────────────────────────────────┘
           │
  ┌────────┼──────────┬────────────┬───────────┬──────────────┐
  │        │          │            │           │              │
┌─▼──┐ ┌───▼───┐ ┌────▼────┐ ┌────▼─────┐ ┌───▼──────┐ ┌─────▼────┐
│MySQL│ │Redis  │ │Elastic- │ │ RabbitMQ │ │ MinIO/   │ │ Spring   │
│     │ │(Sa-Tk)│ │ search  │ │ 消息队列  │ │ AliyunOSS│ │BootAdmin│
└─────┘ └───────┘ └─────────┘ └──────────┘ └──────────┘ └──────────┘
  │                                                        │
  └──────────────────── mall-monitor ──────────────────────┘
```

### 业务架构

- **前台商城系统 (Portal)**：面向 C 端消费者，提供商品浏览、搜索、购物车、订单、会员中心等完整购物体验
- **后台管理系统 (Admin)**：面向 B 端运营人员，覆盖商品、订单、促销、内容、用户、权限 6 大管理域
- **认证中心 (Auth)**：统一登录鉴权入口，支持管理员与会员双体系
- **搜索服务 (Search)**：基于 Elasticsearch 的商品索引与智能检索
- **文章摘要 (ArticleSummary)**：扩展内容模块，支持文章/新闻/论文的摘要聚合与内容推荐

---

## 技术栈

### 后端核心技术

| 技术 | 版本 | 说明 |
|------|------|------|
| **Spring Boot** | 3.5.14 | 微服务容器 + MVC 框架 |
| **Spring Cloud** | 2025.0.2 | 微服务治理套件 (注册/配置/网关等) |
| **Spring Cloud Alibaba** | 2025.0.0.0 | Nacos 服务发现与配置中心 |
| **Sa-Token** | 1.42.0 | 轻量级权限认证框架 (Redis + JWT) |
| **MyBatis** | 3.5.19 | ORM 持久层框架 |
| **MyBatis Spring Boot Starter** | 3.0.4 | MyBatis Spring Boot 集成 |
| **MyBatis Generator** | 1.4.2 | 持久层代码生成器 |
| **PageHelper** | 6.1.1 | MyBatis 物理分页插件 |
| **Druid** | 1.2.24 | 数据库连接池 (监控/防 SQL 注入) |
| **MySQL Connector** | 9.3.0 | MySQL 8.x / 9.x JDBC 驱动 |

### 中间件与扩展组件

| 组件 | 版本 | 说明 |
|------|------|------|
| **Redis** | - | 分布式缓存 + Sa-Token 会话存储 |
| **Elasticsearch** | - | 商品全文搜索引擎 |
| **RabbitMQ** | - | 异步消息队列 (订单/库存/通知) |
| **MinIO** | 8.6.0 | 自建对象存储服务 |
| **阿里云 OSS** | 3.18.5 | 云端对象存储 SDK |
| **Alipay SDK** | 4.40.630.ALL | 支付宝支付 SDK |
| **Knife4j** | 4.5.0 | OpenAPI 3.0 网关聚合文档 |
| **SpringDoc OpenAPI** | 2.8.17 | Swagger 文档生成 |
| **Spring Boot Admin** | 3.5.6 | 微服务监控中心 |
| **Hutool** | 5.8.40 | Java 工具类库 |
| **Logstash Logback** | 8.0 | ELK 日志收集编码器 |

### 前端技术参考

| 技术 | 说明 |
|------|------|
| Vue 3 | 前端框架 |
| Vue Router | 路由管理 |
| Pinia / Vuex | 状态管理 |
| Element Plus | UI 组件库 |
| Axios | HTTP 客户端 |

---

## 项目模块

```
mall-swarm/
├── mall-common/            # [公共模块] 通用返回结果、异常处理、Redis 服务、日志切面等
├── mall-mbg/               # [持久层模块] MyBatis Generator 生成的 Mapper / Model / Example
├── mall-admin/             # [后台管理服务] 商品/订单/促销/内容/用户/权限 管理 API
├── mall-portal/            # [前台商城服务] 搜索/购物车/下单/会员中心 等用户侧 API
├── mall-search/            # [搜索服务] Elasticsearch 商品索引与检索
├── mall-auth/              # [认证服务] 管理员/会员登录、Token 颁发、刷新
├── mall-gateway/           # [网关服务] 统一路由、Sa-Token 鉴权、限流、CORS、熔断
├── mall-monitor/           # [监控服务] Spring Boot Admin 服务监控与指标采集
└── mall-ArticleSummary/    # [文章摘要服务] 文章/新闻/论文 内容聚合与摘要管理 (扩展模块)
```

### 模块职责说明

#### 1. mall-common
- `api/`：通用响应封装 `CommonResult`、分页 `CommonPage`、错误码 `IErrorCode`
- `exception/`：全局异常处理器 `GlobalExceptionHandler`、断言工具 `Asserts`
- `service/`：Redis 操作封装 `RedisService`
- `config/`：Redis 基础配置、常量定义、日志切面

#### 2. mall-mbg
- `Generator.java`：MyBatis Generator 代码生成入口
- `mapper/`：数据库 CRUD Mapper 接口
- `model/`：实体类 + Example 查询条件类
- 支持一键重新生成持久层代码

#### 3. mall-admin
- 商品管理 (Pms)：分类、品牌、属性、SKU、商品上下架、回收站
- 订单管理 (Oms)：订单列表、发货、退款、退货申请、订单设置
- 促销管理 (Sms)：秒杀、优惠券、首页推荐、品牌推荐、广告
- 内容管理 (Cms)：专题、优选、话题、帮助
- 用户管理 (Ums)：管理员、角色、菜单、资源、会员等级
- 文件存储：阿里云 OSS + MinIO 双模式

#### 4. mall-gateway
- 网关路由 (Spring Cloud Gateway)
- Sa-Token 响应式鉴权 `Sa-Token Reactor`
- IP 黑白名单过滤
- Resilience4j 限流熔断
- 请求体大小限制
- 全局 CORS 跨域
- Knife4j 网关聚合文档

#### 5. mall-ArticleSummary (新增扩展)
- 文章、新闻、论文、会员内容聚合
- 摘要检索与分类管理
- 独立数据源与 Mapper 配置

---

## 功能特性

### 后台管理系统

#### 📦 商品管理
- ✅ 商品分类多级树状管理（支持无限级）
- ✅ 品牌管理与品牌产品关联查询
- ✅ 商品属性分类与属性（规格/参数双类型）
- ✅ 商品完整增删改查（会员价、阶梯价、满减、SKU 库存、属性图、专题关联、优选关联）
- ✅ 商品分页多维检索（名称/货号/分类/品牌/上下架状态/审核状态）
- ✅ 批量操作（上下架、推荐、新品、转移分类、放入回收站、审核）
- ✅ 商品回收与还原

#### 🛒 订单管理
- ✅ 订单搜索（编号、收货人、状态、来源、时间范围）
- ✅ 订单详情（基本信息、发票、收货人、商品、费用、操作日志）
- ✅ 订单操作（发货、关闭、删除、修改收货/费用/商品信息、备注、跟踪）
- ✅ 批量发货 / 批量关闭 / 批量删除
- ✅ 订单超时设置、自动完成、自动好评
- ✅ 退货申请处理（确认收货/拒绝退货/确认退货）
- ✅ 退货原因配置

#### 🎁 促销管理
- ✅ 秒杀活动管理（活动时间段、商品关联、上下线）
- ✅ 优惠券管理（满减券、折扣券、领取记录）
- ✅ 首页品牌推荐、新鲜好物、人气推荐、专题精选
- ✅ 首页轮播广告管理

#### 📰 内容管理
- ✅ 专题管理（专题分类、关联商品、推荐）
- ✅ 优选主题（关联商品、排序控制）
- ✅ 话题管理（话题分类、热门标记）
- ✅ 帮助中心（帮助分类、富文本内容）

#### 👥 用户与权限
- ✅ 管理员账号管理（启用/禁用、重置密码）
- ✅ 角色管理（管理员/运营/财务/美工/客服 预置角色）
- ✅ 菜单权限与资源权限（RBAC 粒度）
- ✅ 会员等级、会员标签、成长值/积分规则
- ✅ 购买力多维筛选与用户画像

### 前台商城系统

#### 🔍 商品搜索
- ✅ 综合检索（标题、副标题、关键字）
- ✅ 分类/品牌/属性聚合筛选
- ✅ 新品/销量/价格多维排序
- ✅ 商品相关推荐、浏览历史推荐、搜索记录推荐
- ✅ 热搜词聚合与搜索联想

#### 🛍️ 购物流程
- ✅ 购物车增删改查（支持规格重选）
- ✅ 确认单生成（收货地址、优惠券、积分抵扣、发票、支付方式）
- ✅ 价格计算（商品合计、运费、优惠券、积分、活动优惠）
- ✅ 订单提交（库存锁定、在线支付：支付宝/微信/银联/ApplePay）
- ✅ 支付回调与订单状态流转
- ✅ 超时订单自动取消（库存解锁、优惠券返还、积分返还）

#### 👤 会员中心
- ✅ 关注品牌 / 收藏商品（专题/话题）
- ✅ 足迹浏览记录
- ✅ 会员注册/登录/忘记密码（短信验证码）
- ✅ 收货地址管理

---

## 环境要求

### 本地开发环境

| 软件 | 推荐版本 | 说明 |
|------|----------|------|
| **JDK** | 17.x | LTS 版本，项目基于 Java 17 编译 |
| **Maven** | 3.9.x | 构建工具（或使用 IDE 内置 Maven Wrapper） |
| **MySQL** | 8.0+ / 9.x | 主数据库，字符集 utf8mb4 |
| **Redis** | 7.0+ | 缓存与 Sa-Token 会话存储 |
| **Elasticsearch** | 8.x | 商品搜索引擎（IK 分词器） |
| **RabbitMQ** | 3.12+ | 消息中间件（延迟插件推荐） |
| **Nacos** | 2.3+ | 服务注册与配置中心（Spring Cloud Alibaba 默认） |
| **MinIO** | RELEASE.2024+ | 对象存储（可选，可用阿里云 OSS 替代） |
| **Node.js** | 18+ | 前端构建（如需本地启动前端） |

### 端口规划

| 服务 | 默认端口 | 说明 |
|------|----------|------|
| mall-gateway | 8201 | 统一网关入口 |
| mall-auth | 8401 | 认证服务 |
| mall-admin | 8101 | 后台管理 API |
| mall-portal | 8085 | 前台商城 API |
| mall-search | 8301 | 搜索服务 |
| mall-monitor | 8501 | Spring Boot Admin |
| mall-ArticleSummary | 8601 | 文章摘要服务 |
| Nacos | 8848 | 配置中心/注册中心 |
| MySQL | 3306 | 数据库 |
| Redis | 6379 | 缓存 |
| Elasticsearch | 9200 | 搜索引擎 |
| RabbitMQ | 5672 / 15672 | 消息队列 / 管理台 |
| MinIO | 9000 / 9001 | 对象存储 / 控制台 |

---

## 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd CBEC-puls/mall-swarm
```

### 2. 初始化数据库

```bash
# 1. 创建数据库
mysql -u root -p -e "CREATE DATABASE mall CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. 导入数据脚本
mysql -u root -p mall < document/sql/mall.sql
```

### 3. 中间件启动

#### 方式一：Docker Compose（推荐）

```bash
cd document/docker

# 启动基础环境 (MySQL / Redis / ES / RabbitMQ / Nacos / MinIO)
docker-compose -f docker-compose-env.yml up -d

# 等待 Nacos 就绪后，导入配置 (config/ 目录下各模块 yaml)
# 访问 http://localhost:8848/nacos  账号:nacos  密码:nacos
```

#### 方式二：本地安装

参照各中间件官方文档安装并启动，然后修改对应 `application-dev.yml` 中的连接地址。

### 4. Nacos 配置导入

在 Nacos 控制台 → 配置管理 → 配置列表，按以下格式创建配置：

| Data ID | Group | 配置内容 |
|---------|-------|----------|
| mall-admin-dev.yaml | DEFAULT_GROUP | `config/admin/mall-admin-dev.yaml` |
| mall-admin-prod.yaml | DEFAULT_GROUP | `config/admin/mall-admin-prod.yaml` |
| mall-gateway-dev.yaml | DEFAULT_GROUP | `config/gateway/mall-gateway-dev.yaml` |
| ... | ... | 以此类推 |

> 命名规则：`${spring.application.name}-${spring.profiles.active}.yaml`

### 5. 本地编译与启动

```bash
# 进入项目根目录
cd mall-swarm

# 全量编译（跳过测试）
mvn clean install -DskipTests

# 按依赖顺序启动各服务
# 1. mall-mbg / mall-common (已 install，不需要单独启动)
# 2. mall-gateway   (mvn -pl mall-gateway spring-boot:run)
# 3. mall-auth
# 4. mall-admin / mall-portal / mall-search / mall-ArticleSummary
# 5. mall-monitor
```

### 6. 验证服务

| 验证项 | 地址 | 预期结果 |
|--------|------|----------|
| 网关健康检查 | `http://localhost:8201/actuator/health` | `{"status":"UP"}` |
| Knife4j 聚合文档 | `http://localhost:8201/doc.html` | API 文档首页 |
| mall-admin 登录 | `POST http://localhost:8201/admin/login` | 返回 token |
| Spring Boot Admin | `http://localhost:8501` | 监控台（默认无鉴权） |

---

## 部署说明

### Docker Compose 全量部署

```bash
cd document/docker

# 1. 先启动中间件
docker-compose -f docker-compose-env.yml up -d

# 2. 等待中间件健康后，打包所有服务镜像
cd ../..
mvn clean package -DskipTests dockerfile:build

# 3. 启动应用服务
cd document/docker
docker-compose -f docker-compose-app.yml up -d

# 4. 查看状态
docker-compose -f docker-compose-app.yml ps
```

### Kubernetes 部署

项目已提供各服务的 K8s Deployment 与 Service 清单，位于 `document/k8s/`：

```
document/k8s/
├── mall-gateway-deployment.yaml      mall-gateway-service.yaml
├── mall-admin-deployment.yaml        mall-admin-service.yaml
├── mall-auth-deployment.yaml         mall-auth-service.yaml
├── mall-portal-deployment.yaml       mall-portal-service.yaml
├── mall-search-deployment.yaml       mall-search-service.yaml
└── mall-monitor-deployment.yaml      mall-monitor-service.yaml
```

```bash
# 创建命名空间
kubectl create namespace cbec

# 应用配置与密钥（需要提前创建 ConfigMap/Secret，对应 Nacos / DB / Redis 等地址）
# kubectl apply -f your-configmap.yaml

# 一键部署全部服务
kubectl apply -f document/k8s/ -n cbec

# 查看部署进度
kubectl get pods -n cbec -w
```

### Windows 本地部署参考

详细图文指南请参考：[document/reference/deploy_windows.md](mall-swarm/document/reference/deploy_windows.md)

---

## 目录结构

```
CBEC-puls/
├── LICENSE                           # Apache 2.0 许可证
├── README.md                         # 项目说明文档
├── .gitignore                        # Git 忽略规则
│
└── mall-swarm/                       # 项目源码根
    ├── pom.xml                       # Maven 父工程 POM（统一版本与依赖管理）
    │
    ├── config/                       # Nacos 配置中心配置文件
    │   ├── admin/                    # mall-admin dev/prod 配置
    │   ├── gateway/                  # mall-gateway dev/prod 配置
    │   ├── portal/                   # mall-portal dev/prod 配置
    │   ├── search/                   # mall-search dev/prod 配置
    │   ├── ArticleSummary/           # mall-ArticleSummary dev/prod 配置
    │   └── demo/                     # demo 环境配置示例
    │
    ├── document/                     # 项目文档与部署资源
    │   ├── sql/mall.sql              # 数据库初始化脚本
    │   ├── docker/                   # Docker Compose 部署
    │   ├── k8s/                      # Kubernetes 部署清单
    │   ├── elk/                      # ELK 日志收集配置
    │   ├── sh/                       # Linux 服务启停脚本
    │   ├── mind/                     # 业务思维导图 (emmx)
    │   ├── pdm/                      # 数据库设计 (PowerDesigner)
    │   ├── pos/                      # 架构图 (ProcessOn)
    │   ├── reference/                # 开发参考文档
    │   │   ├── dev_flow.md           # 开发流程
    │   │   ├── function.md           # 功能结构说明
    │   │   └── deploy_windows.md     # Windows 部署指南
    │   ├── resource/                 # 文档截图资源
    │   └── api-interfaces.html       # 旧版接口文档
    │
    ├── mall-common/                  # 公共基础模块
    ├── mall-mbg/                     # 持久层 (MyBatis Generator)
    ├── mall-admin/                   # 后台管理微服务
    ├── mall-portal/                  # 前台商城微服务
    ├── mall-search/                  # 搜索微服务
    ├── mall-auth/                    # 认证微服务
    ├── mall-gateway/                 # 网关微服务
    ├── mall-monitor/                 # 监控微服务
    └── mall-ArticleSummary/          # 文章摘要扩展微服务
```

---

## 开发规范

### 代码分层

```
Controller (接收请求/参数校验)
    ↓
Service (业务逻辑/事务控制)
    ↓  impl/
    ↓  ServiceImpl
Mapper (MyBatis DAO) ←→ mall-mbg 生成 + 自定义 XML
    ↓
MySQL / Redis / ES
```

### 命名规范

| 层级 | 后缀 | 示例 |
|------|------|------|
| 控制层 | Controller | `PmsProductController` |
| 业务接口 | Service | `PmsProductService` |
| 业务实现 | ServiceImpl | `PmsProductServiceImpl` |
| 自定义 DAO | Dao | `PmsProductDao` |
| 传输对象 | DTO / Param / Result | `PmsProductParam`, `OmsOrderDetail` |
| 实体类 | 无前缀（MBG 生成） | `PmsProduct`, `UmsAdmin` |
| 配置类 | Config | `RedisConfig`, `SaTokenConfigure` |

### Git 提交信息规范

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
```

**type 约定**：
- `feat`: 新功能
- `fix`: 修复 Bug
- `docs`: 文档变更
- `style`: 代码格式（不影响功能）
- `refactor`: 重构（非功能、非修复）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链/依赖升级

**示例**：
```
feat(gateway): 添加 Sa-Token IP 白名单过滤机制

- 新增 IpFilterProperties 配置类
- 支持 CIDR 格式批量配置
- 未匹配请求返回 403 GatewayException
```

### 开发流程参考图

详见：[开发流程文档](mall-swarm/document/reference/dev_flow.md) 与 [功能结构说明](mall-swarm/document/reference/function.md)

---

## 贡献指南

欢迎提交 Issue 与 Pull Request：

1. Fork 本仓库到自己的命名空间
2. 新建功能分支：`git checkout -b feature/your-feature`
3. 提交代码并遵循上述 Git 规范
4. 发起 Pull Request，描述变更内容与动机
5. 等待 Review 与合并

---

## 许可证

本项目基于 **Apache License 2.0** 开源，详见 [LICENSE](LICENSE) 文件。

```
Copyright 2024-2026 CBEC-puls Contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

<div align="center">

**Made with ❤️ by CBEC-puls Team**

</div>
