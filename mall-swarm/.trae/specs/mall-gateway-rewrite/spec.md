# mall-gateway 架构重写规格说明

## 1. 问题陈述

### 1.1 当前问题
mall-gateway 模块存在以下架构级和功能级问题：

**架构缺陷：**
- 缺少清晰的分层结构，类平铺在 `config`/`component`/`util` 包中，职责边界模糊
- `StpMemberUtil.java` 是一个 1238 行的巨型类，完全拷贝了 Sa-Token 的 `StpUtil` 源码，维护成本极高且违反 DRY 原则
- 鉴权配置类 `SaTokenConfig` 直接耦合 RedisTemplate 操作，缺少抽象层
- 没有响应式全局异常处理器，异常处理仅覆盖 Sa-Token 鉴权异常

**配置缺陷：**
- `application.yml` 路由配置缩进错误：`discovery.locator` 和 `routes` 错误地嵌套在 `server.webflux` 层级下，可能导致路由规则不生效
- Redis 密码不一致：`application.yml` 中为 `redis_EE7cMc`，与 mall-portal 的 `redis_EE7cM` 存在差异，需确认并修正
- 缺少 Redis 健康检查禁用配置，Redis 认证失败时会产生大量错误日志
- 缺少 Nacos 配置与本地配置的优先级控制

**功能缺失（关键网关能力）：**
- 无请求追踪（TraceId）过滤器，跨服务调用链无法追踪
- 无网关级请求/响应访问日志过滤器，问题排查困难
- 无 IP 黑白名单过滤器，缺少基础安全防护
- 无安全响应头过滤器（X-XSS-Protection、X-Content-Type-Options、Strict-Transport-Security 等）
- 无限流过滤器（RequestRateLimiter），无法保护后端服务免于流量突发
- 无熔断降级过滤器（CircuitBreaker），下游服务故障时无法优雅降级
- 无请求体大小限制过滤器，存在大请求攻击风险
- 缺少将用户认证信息通过请求头传递给下游服务的机制
- 缺少 mall-monitor 监控服务路由配置

**可观测性缺陷：**
- 无自定义网关 Metrics 埋点
- 访问日志格式不统一
- 单元测试为空（`MallGatewayApplicationTests` 无测试方法）

### 1.2 影响用户
- **后端开发人员**：排查线上问题时缺少 TraceId，日志追踪困难；路由配置错误导致服务不可达；Redis 健康检查刷屏干扰问题定位
- **运维人员**：缺少限流和熔断能力，下游服务故障时网关层无法提供保护；无统一访问日志，难以分析流量模式
- **安全团队**：缺少 IP 黑白名单、安全响应头等基础安全防护能力
- **前端调用方**：路由配置缩进错误可能导致部分服务 404

## 2. 用户与目标

### 2.1 主要用户
| 用户 | 目标 |
|------|------|
| 后端开发 | 清晰的代码分层，可维护的过滤器链，可追踪的请求日志 |
| 运维/SRE | 网关具备限流、熔断能力，可观测性完善（Metrics、TraceId、访问日志） |
| 安全相关方 | IP 黑白名单、安全响应头、请求体大小限制 |
| 业务调用方 | 路由正确、鉴权有效、跨服务用户上下文传递 |

### 2.2 项目目标
1. **架构重构**：采用清晰的分层包结构（config / filter / auth / exception / util / domain），职责分离
2. **配置修正**：修复路由配置缩进、统一 Redis 密码、禁用不必要的健康检查
3. **过滤器链**：实现 TraceId、访问日志、IP 黑白名单、安全响应头、限流、熔断、请求体大小限制、用户头透传共 8 种网关过滤器
4. **鉴权优化**：保留 Sa-Token 能力但重构 StpMemberUtil 消除重复代码，解耦鉴权配置与 Redis 操作
5. **异常处理**：新增 WebFlux 全局异常处理器，统一响应格式
6. **可观测性**：完善 Metrics、统一访问日志格式、补充单元测试
7. **向后兼容**：保持现有 API 路径、鉴权方式、白名单规则不变

## 3. 非目标（Out of Scope）

- ❌ 不更换鉴权框架（继续使用 Sa-Token，不切换到 Spring Security/OAuth2）
- ❌ 不引入新的服务注册发现组件（继续使用 Nacos）
- ❌ 不实现业务级的用户管理（由 mall-auth、mall-admin、mall-portal 负责）
- ❌ 不重写 mall-common 中的公共类（仅使用不修改）
- ❌ 不实现动态路由管理（路由仍由配置文件驱动）
- ❌ 不实现灰度发布/蓝绿部署/流量染色等高级路由能力
- ❌ 不引入 Sentinel（使用 Spring Cloud Gateway 原生 + Resilience4j）

## 4. 功能需求

### FR-1 架构分层重构
将 mall-gateway 代码按职责分层到以下包结构：
```
com.macro.mall.gateway
├── MallGatewayApplication.java          # 启动类
├── config                                # 配置类
│   ├── GatewayRouteConfig.java           # 路由配置（从yml移到Java或保持yml但修复缩进）
│   ├── SaTokenAuthConfig.java            # Sa-Token 鉴权配置（重命名，解耦Redis）
│   ├── GlobalCorsConfig.java             # 跨域配置（保留，优化）
│   ├── IgnoreUrlsConfig.java             # 白名单配置（保留，扩展校验）
│   ├── RedisConfig.java                  # Redis 配置（保留）
│   ├── Resilience4jConfig.java           # 熔断限流配置（新增）
│   └── SecurityHeadersConfig.java        # 安全响应头配置（新增）
├── filter                                # 网关过滤器（核心新增层）
│   ├── global                            # GlobalFilter（全局过滤器）
│   │   ├── TraceIdGlobalFilter.java      # TraceId 追踪
│   │   ├── AccessLogGlobalFilter.java    # 访问日志
│   │   ├── UserHeaderGlobalFilter.java   # 用户头透传到下游
│   │   ├── IpBlacklistGlobalFilter.java  # IP 黑名单过滤
│   │   ├── RequestSizeGlobalFilter.java  # 请求体大小限制
│   │   └── SecurityHeadersGlobalFilter.java # 安全响应头
│   └── gateway                           # GatewayFilter（可复用过滤器）
│       └── RateLimitGatewayFilter.java   # 基于Redis的限流过滤器
├── auth                                  # 鉴权相关（从config/component抽离）
│   ├── StpMemberLoginType.java           # 会员登录类型常量（替换StpMemberUtil中的TYPE常量）
│   ├── StpInterfaceImpl.java             # 权限接口实现（从component移入）
│   └── PermissionChecker.java            # 权限校验逻辑（从SaTokenConfig抽离）
├── exception                             # 异常处理
│   ├── GlobalErrorWebExceptionHandler.java # WebFlux全局异常处理器（新增）
│   └── GatewayException.java             # 网关自定义异常（新增）
├── domain                                # 领域对象/DTO
│   ├── AccessLog.java                    # 访问日志领域对象
│   ├── RateLimitRule.java                # 限流规则
│   └── IpFilterRule.java                 # IP过滤规则
└── util                                  # 工具类（精简）
    └── TraceIdUtil.java                  # TraceId工具（替代巨型StpMemberUtil）
```

### FR-2 配置修正与优化
1. 修复 `application.yml` 中 `discovery.locator` 和 `routes` 的缩进层级，移至正确的 `spring.cloud.gateway` 下
2. 确认并统一 Redis 密码，与 mall-portal 保持一致
3. 新增 `management.health.redis.enabled: false` 禁用 Redis 健康检查，避免认证失败日志刷屏
4. 新增 mall-monitor 路由（路径 `/mall-monitor/**`）
5. 新增 mall-auth 更细粒度的白名单路径
6. 新增 Resilience4j 熔断配置（默认 50% 失败率阈值，10s 滑动窗口）
7. 新增 Redis 限流 KeyResolver 配置（按 IP + 路径限流）
8. 优化 Actuator 配置，隐藏敏感 env/configprops 值（`show-values: when-authorized`）

### FR-3 TraceId 全局过滤器
- 实现 `TraceIdGlobalFilter` 实现 `GlobalFilter, Ordered`
- 入站请求：检查请求头 `X-Trace-Id`，若不存在则生成 UUID 作为 TraceId
- 响应回写：将 TraceId 写入响应头 `X-Trace-Id`
- 集成到 Reactor Context：通过 `Context.of("traceId", traceId)` 传递给下游过滤器链
- MDC 集成：使用 reactor.util.context.Context 记录 TraceId（SLF4J MDC 在线程池场景需特殊处理）
- 有序性：Order = -100（最优先执行，确保所有后续过滤器都能获取 TraceId）

### FR-4 访问日志全局过滤器
- 实现 `AccessLogGlobalFilter`（Order = -90，紧随 TraceId 之后）
- 记录字段：请求时间、TraceId、HTTP 方法、请求路径、源 IP、目标服务ID、响应状态码、耗时（ms）、请求大小（字节）、响应大小（字节）
- 日志级别：INFO 级别输出结构化 JSON
- 敏感路径过滤：对 `/actuator/**` 路径跳过详细日志
- 避免二次消费：使用 `ServerHttpRequestDecorator` / `ServerHttpResponseDecorator` 包装请求/响应体捕获大小，不干扰原始流

### FR-5 IP 黑白名单过滤器
- 实现 `IpBlacklistGlobalFilter`（Order = -80）
- 从配置文件读取黑名单 IP 列表（支持 CIDR，如 `192.168.1.0/24`）
- 匹配到黑名单 IP 时立即返回 403，响应体为 `CommonResult.forbidden("IP blocked")`
- 白名单模式可选：配置 `gateway.ip-filter.mode = whitelist` 时切换为白名单模式
- 默认黑名单列表为空（不阻止任何 IP）

### FR-6 安全响应头过滤器
- 实现 `SecurityHeadersGlobalFilter`（Order = -70）
- 注入以下安全响应头：
  - `X-Content-Type-Options: nosniff`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`（仅 HTTPS 环境）
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy: default-src 'self'`（可配置放宽）
- 可通过配置开关禁用单种头

### FR-7 限流过滤器
- 实现 `RateLimitGatewayFilterFactory` 继承 `AbstractGatewayFilterFactory`
- 使用 Redis + Lua 脚本实现令牌桶算法（原子性）
- 可配置参数：`replenishRate`（每秒生成令牌数）、`burstCapacity`（突发容量）、`keyResolver`（限流键）
- 默认 KeyResolver：按 `IP + 路径` 组合键限流
- 超出限流时返回 429（Too Many Requests），响应头 `Retry-After: 1`
- 提供两个预设过滤器：mall-admin（100 req/s/IP）、mall-portal（200 req/s/IP）

### FR-8 熔断降级过滤器
- 引入 `spring-cloud-starter-circuitbreaker-reactor-resilience4j` 依赖
- 配置 Resilience4j CircuitBreaker 实例：
  - `slidingWindowSize = 10`、`failureRateThreshold = 50%`、`waitDurationInOpenState = 30s`
  - `slowCallDurationThreshold = 5s`、`slowCallRateThreshold = 60%`
- 在所有业务路由（mall-admin/mall-portal/mall-search/mall-ArticleSummary/mall-auth）上启用 `CircuitBreaker` GatewayFilter
- 降级响应：服务熔断时返回 503，响应体 `CommonResult.failed("Service temporarily unavailable")`

### FR-9 请求体大小限制过滤器
- 实现 `RequestSizeGlobalFilter`（Order = -60）
- 配置 `gateway.request.max-size = 10MB`（默认值，可配置）
- 超出限制立即返回 413（Payload Too Large）
- 限制既适用于 Content-Length 头也适用于分块传输编码（实际读取字节数）

### FR-10 用户头透传过滤器
- 实现 `UserHeaderGlobalFilter`（Order = -50，鉴权之后执行）
- 从 Sa-Token Session 获取当前登录用户信息（admin/member 两种类型）
- 将以下信息编码为 Base64(JSON) 写入请求头 `X-Gateway-User`：
  - `userId`、`username`、`loginType`、`clientId`、`permissionList`（仅 admin）
- 下游服务可解码该请求头获取网关层认证的用户信息，避免重复鉴权
- 未登录请求不写入该头

### FR-11 鉴权重构（Sa-Token）
1. **消除 StpMemberUtil 巨型类**：删除 1238 行的拷贝代码，改用 Sa-Token 的多账号体系原生 API：
   - 使用 `StpUtil.getStpLogic("memberLogin")` 获取会员登录上下文
   - 登录：`StpUtil.loginByDevice(id, device, "memberLogin")` 或定义轻量 Wrapper
   - 将 TYPE 常量移入 `auth/StpMemberLoginType.java`
2. **重构 StpInterfaceImpl**：增加空值安全检查（Session 中无数据时返回空列表而非 NPE）
3. **解耦 SaTokenConfig 与 Redis**：
   - 将权限映射查询逻辑抽离到 `auth/PermissionChecker.java`
   - Sa-Token 配置类仅负责过滤器注册和异常处理
   - 支持 Redis 不可用时跳过权限校验（降级为仅登录校验）

### FR-12 全局异常处理器
- 实现 `GlobalErrorWebExceptionHandler` 实现 `ErrorWebExceptionHandler`
- 覆盖以下异常类型并统一返回 `CommonResult`：
  - `NotLoginException` → 401 `CommonResult.unauthorized`
  - `NotPermissionException` / `NotRoleException` → 403 `CommonResult.forbidden`
  - `ResponseStatusException` → 对应 status code + `CommonResult.failed`
  - `BlockedException`（限流熔断）→ 429/503 `CommonResult.failed`
  - `GatewayException`（自定义）→ 对应 code
  - 其他异常 → 500 `CommonResult.failed(e.getMessage)`
- 始终设置响应头 `Content-Type: application/json; charset=utf-8` 和 TraceId
- 异常堆栈仅 DEBUG 级别输出，INFO 级别只输出错误摘要

### FR-13 可观测性与测试
- 在访问日志过滤器中加入 Micrometer Metrics：
  - `gateway_requests_total`（Counter，tag: method, service, status）
  - `gateway_request_duration_seconds`（Timer，tag: method, service）
- 补充单元测试覆盖率 ≥ 60%：
  - `IgnoreUrlsConfig` 配置绑定测试
  - `PermissionChecker` 路径匹配测试
  - `IpBlacklistGlobalFilter` 黑白名单匹配测试（含 CIDR）
  - `TraceIdGlobalFilter` TraceId 生成/传递测试
  - `RateLimitGatewayFilter` 限流逻辑测试（mock Redis）
  - `GlobalErrorWebExceptionHandler` 异常映射测试
  - 轻量集成测试：`SpringBootTest(webEnvironment = MOCK)` 验证上下文加载

## 5. 非功能需求

### NFR-1 性能
- 所有新增 GlobalFilter 单次执行 CPU 耗时 < 1ms（不含 Redis 调用）
- 限流过滤器 Redis Lua 脚本执行 P99 < 5ms（本地 Redis）
- 网关额外延迟（与裸 Gateway 相比）P95 < 20ms

### NFR-2 可靠性
- 任何单一过滤器异常不得导致整个过滤器链崩溃（异常被捕获并交给全局异常处理器）
- Redis 不可用时：限流降级为放行、鉴权降级为仅登录校验、访问日志正常记录
- Nacos 不可用时：使用本地 `application.yml` 路由配置继续工作

### NFR-3 安全性
- 网关响应体中永远不返回堆栈信息（生产环境）
- TraceId 使用加密安全的随机源（`UUID.randomUUID()`）
- `X-Gateway-User` 头内容以 Base64 编码，同时校验签名以防止下游伪造（可选 HMAC）

### NFR-4 可维护性
- 所有过滤器和配置类必须包含 JavaDoc 说明用途、执行顺序、配置方式
- 配置变更通过 `@ConfigurationProperties` 绑定，不硬编码
- 包结构遵循"同类相聚"原则，新增功能时开发者能快速定位

### NFR-5 兼容性
- 现有白名单路径、路由前缀、Sa-Token Token 名/前缀保持不变
- `CommonResult` 结构不变（code/message/data 三字段）
- 端口仍为 8201，应用名仍为 mall-gateway

## 6. 约束、依赖与假设

### 6.1 技术约束
- Spring Boot 3.5.14、Spring Cloud 2025.0.2、Spring Cloud Alibaba 2025.0.0.0（父 POM 锁定版本）
- 继续使用 Sa-Token 1.42.0 作为鉴权框架
- 响应式栈：Spring Cloud Gateway WebFlux（不得引入 spring-boot-starter-web）
- Redis 客户端使用 Spring Data Redis（已在 pom.xml）
- 熔断限流：Resilience4j + Spring Cloud CircuitBreaker（不得引入 Sentinel）

### 6.2 外部依赖
- **Redis (192.168.100.137:6379)**：用于 Sa-Token Session、限流计数器、权限缓存。需确认密码后修正配置。
- **Nacos (192.168.100.137:8848)**：服务发现与配置中心。
- **下游微服务**：mall-admin、mall-portal、mall-search、mall-auth、mall-ArticleSummary、mall-monitor。

### 6.3 已知假设
- Redis 密码以 mall-portal 中 `redis_EE7cM` 为准（少一个 c），若实际不同需运维调整。
- 用户不希望更换鉴权框架（Sa-Token 保留）。
- 生产部署使用 HTTPS，Strict-Transport-Security 头生效。
- IP 黑白名单规模较小（< 1000 条），使用内存匹配即可，无需引入额外策略引擎。

## 7. 开放问题（待用户确认）

| ID | 问题 | 影响 | 当前假设 |
|----|------|------|----------|
| Q1 | Redis 正确密码是 `redis_EE7cM`（mall-portal）还是 `redis_EE7cMc`（mall-gateway）？ | 鉴权、限流、Sa-Token Session 能否正常工作 | 假设使用 `redis_EE7cM`，与 mall-portal 对齐 |
| Q2 | 是否需要对 mall-auth 服务启用限流和熔断？ | 登录接口防暴力破解需求 | 默认启用（与其他业务路由一致） |
| Q3 | `X-Gateway-User` 头是否需要 HMAC 签名防伪造？ | 安全级别 | 默认使用 Base64 不签名，若下游服务不校验该头则风险可控 |
| Q4 | 是否需要 mall-monitor 路由加入鉴权白名单？ | 监控端点暴露策略 | 默认不拦截（`/mall-monitor/**` 加入白名单），依赖 SBA 自身鉴权 |

## 8. 验收标准（Acceptance Criteria）

### 8.1 规则型（Rule）—— 可客观验证的二元条件

| ID | 规则 | 验证方式 |
|----|------|----------|
| AC-R1 | `application.yml` 路由配置缩进正确，`routes` 和 `discovery.locator` 直接在 `spring.cloud.gateway` 下，不在 `server.webflux` 下 | 读取 application.yml 检查层级 |
| AC-R2 | 启动类可正常启动（ApplicationContext 加载无异常），无 ClassNotFoundException/BeanCreationException | `mvn test` + 手动 `mvn spring-boot:run`（Redis/Nacos 不可用时降级也需正常启动） |
| AC-R3 | 包结构符合 FR-1 定义（config/filter/global/filter/gateway/auth/exception/domain/util 各层存在且类归属正确） | 目录结构审阅 |
| AC-R4 | 原始 `util/StpMemberUtil.java`（1238行）被删除或大幅精简（≤ 50 行），不再包含 Sa-Token 拷贝代码 | 文件行数统计 |
| AC-R5 | 8 种过滤器全部存在且按 Order 排序正确（TraceId -100 → AccessLog -90 → IP -80 → 安全头 -70 → 大小限制 -60 → 用户头 -50），且均标注 JavaDoc | 源代码审阅 + Order 常量值比对 |
| AC-R6 | 限流过滤器在 Redis 可用时生效，超限请求返回 HTTP 429 + Retry-After 头 | 集成测试（curl 连续调用 10 次） |
| AC-R7 | 熔断过滤器在下游服务 50% 失败率时打开，返回 503 + `CommonResult.failed("Service temporarily unavailable")` | 测试中模拟下游 5xx，验证熔断 |
| AC-R8 | 黑名单 IP 请求返回 403 + `CommonResult.forbidden("IP blocked")` | 集成测试（设置 127.0.0.1 为黑名单后访问） |
| AC-R9 | 安全响应头在所有非静态资源响应中包含（X-Content-Type-Options/X-XSS-Protection/X-Frame-Options 至少 3 项） | curl -I 验证响应头 |
| AC-R10 | TraceId 在请求头/响应头/日志中一致，无 TraceId 的入站请求会被自动生成 | curl 测试 + 日志比对 |
| AC-R11 | 用户头透传：已登录 mall-admin 请求路由到下游时包含 `X-Gateway-User` 请求头（Base64 可解码） | 集成测试 + 下游日志断言 |
| AC-R12 | 全局异常处理器：`NotLoginException` → 401，`NotPermissionException` → 403，限流 → 429，未知异常 → 500，响应体均为 `CommonResult` JSON | WebTestClient 异常用例测试 |
| AC-R13 | `management.health.redis.enabled: false` 设置生效，Redis 不可用时不刷屏健康检查错误日志 | 启动后等待 1 分钟检查日志 |
| AC-R14 | Actuator env/configprops 的 `show-values` 设为 `when-authorized`，不在未授权时暴露密码 | curl `/actuator/env` 验证密码字段为星号 |
| AC-R15 | 单元测试覆盖率 ≥ 60%，至少包含 FR-13 列出的 7 个测试类 | JaCoCo 报告或 IDE 覆盖率统计 |
| AC-R16 | 路由包含 mall-monitor：`/mall-monitor/**` → `lb://mall-monitor` + StripPrefix=1 | 配置文件检查 + 路由断言 |
| AC-R17 | 所有过滤器的异常被捕获并交给全局异常处理器，不出现 500 堆栈直接返回前端 | 手动抛异常测试验证响应格式 |

### 8.2 评审型（Rubric）—— 评估质量维度，含通过阈值

| ID | 维度 | 评分范围 | 通过阈值 | 低/中/高锚点 | 证据来源 |
|----|------|---------|---------|------------|---------|
| AC-U1 | 架构分层清晰度 | 0-2 | ≥ 1.5 | 0=类仍乱堆在根包；1=分层但部分类归属模糊；2=每层职责单一、交叉依赖<2处 | 代码评审 + 依赖图 |
| AC-U2 | 过滤器解耦与可配置性 | 0-2 | ≥ 1.5 | 0=大量硬编码参数；1=部分参数可配置；2=所有阈值/开关均通过 `@ConfigurationProperties` 绑定且有默认值 | 源代码审阅（@ConfigurationProperties 使用数） |
| AC-U3 | 代码可维护性（JavaDoc + 命名一致性） | 0-2 | ≥ 1.5 | 0=无文档无注释；1=关键类有 JavaDoc，命名基本一致；2=所有 public 类/方法含 JavaDoc，遵循统一命名约定 | 审阅覆盖率 + SpotBugs/Checkstyle 风格一致性 |
| AC-U4 | 降级与容错完备性 | 0-2 | ≥ 1.0 | 0=Redis/Nacos 不可用直接启动失败；1=单一依赖不可用部分降级；2=Redis 和 Nacos 同时不可用时网关仍可启动并返回静态 503/路由本地缓存 | 故障注入测试（断 Redis、断 Nacos 启动） |
| AC-U5 | 向后兼容性（配置路径+Token+白名单） | 0-2 | ≥ 2.0 | 0=现有客户端调用大量失败；1=2 处以下不兼容；2=0 处不兼容，现有 curl 用例无需修改全部通过 | 回归测试：对比重写前后对 mall-portal/mall-admin 的 10 条典型调用 |
| AC-U6 | 性能影响（相对原网关） | 0-2 | ≥ 1.0 | 0=P95 延迟增加 > 100ms；1=20-100ms；2=< 20ms | wrk 压测：相同 1000 QPS 下对比 P50/P95/P99 |
