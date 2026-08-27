# mall-gateway 重写任务清单

> 关联规范：[spec.md](./spec.md)
> 状态图例：`pending` / `in_progress` / `blocked` / `completed` / `cancelled`

---

## Task 1：POM 依赖调整与包结构创建

**依赖关系**：无（入口任务）
**优先级**：high
**覆盖 AC**：AC-R3

### 任务描述
1. 在 `pom.xml` 中新增熔断限流依赖：
   - `org.springframework.cloud:spring-cloud-starter-circuitbreaker-reactor-resilience4j`
   - （版本由父 POM Spring Cloud BOM 管理，无需显式声明 version）
2. 按 FR-1 创建目标包目录结构（空目录）：
   - `com.macro.mall.gateway.config`
   - `com.macro.mall.gateway.filter.global`
   - `com.macro.mall.gateway.filter.gateway`
   - `com.macro.mall.gateway.auth`
   - `com.macro.mall.gateway.exception`
   - `com.macro.mall.gateway.domain`
   - `com.macro.mall.gateway.util`
3. 将启动类 `MallGatewayApplication` 移动到 `com.macro.mall.gateway` 根包下（原路径 `com.macro.mall`）。
   - 同步修改 `@SpringBootApplication scanBasePackages` 默认扫描。
4. 将测试类 `MallGatewayApplicationTests` 同步移动到对应测试包。

### 局部测试要求（Test Requirements）

| ID | 类型 | 条件 | 验证方式 |
|----|------|------|----------|
| T1-TR1 | rule | `mvn dependency:tree` 中能看到 resilience4j 相关依赖（`io.github.resilience4j:resilience4j-circuitbreaker`） | 运行 `mvn dependency:tree | grep resilience4j` |
| T1-TR2 | rule | 所有目录结构存在，启动类所在包为 `com.macro.mall.gateway` | `ls` + `head MallGatewayApplication.java` 查看 package 声明 |
| T1-TR3 | rule | `mvn -pl mall-gateway compile` 无编译错误 | Maven 编译日志 |
| T1-TR4 | rubric | 包结构整洁度（0-2），阈值 ≥ 1.5 | 手动审阅：无多余目录，层级清晰 |

**状态**：pending
**完成证据**：（实现时填写）

---

## Task 2：配置文件修复与优化

**依赖关系**：Task 1
**优先级**：high
**覆盖 AC**：AC-R1、AC-R13、AC-R14、AC-R16、FR-2

### 任务描述
1. **修复 application.yml 路由缩进**（最关键 Bug）：
   - 将 `discovery.locator` 和 `routes` 从 `spring.cloud.gateway.server.webflux.xxx` 上移到 `spring.cloud.gateway.xxx`
   - 正确层级：
     ```
     spring:
       cloud:
         gateway:
           discovery:
             locator:
               enabled: true
               lower-case-service-id: true
           routes:
             - id: mall-auth ...
             - id: mall-admin ...
             ...
     ```
2. **修正 Redis 密码**：统一为 `redis_EE7cM`（与 mall-portal 对齐）。
3. **禁用 Redis 健康检查**：新增 `management.health.redis.enabled: false`。
4. **收紧 Actuator 信息泄露**：
   - `management.endpoint.env.show-values: when-authorized`
   - `management.endpoint.configprops.show-values: when-authorized`
   - 保留 `endpoints.web.exposure.include: '*'`（方便排查，但敏感值默认隐藏）。
5. **新增 mall-monitor 路由**：
   ```yaml
   - id: mall-monitor
     uri: lb://mall-monitor
     predicates:
       - Path=/mall-monitor/**
     filters:
       - StripPrefix=1
   ```
6. **扩展白名单**：
   - 在 `secure.ignore.urls` 中追加 `"/mall-monitor/**"`。
   - 追加 mall-auth 完整路径：`"/mall-auth/**"`（已存在，确认即可）。
7. **新增 Resilience4j 与限流配置段**（占位，配合 Task 8 和 Task 9 的代码）。
8. **同步修改 Nacos 外部配置**：
   - `config/gateway/mall-gateway-dev.yaml` Redis 密码对齐 `redis_EE7cM`，禁用 Redis 健康检查。
   - `config/gateway/mall-gateway-prod.yaml` 禁用 Redis 健康检查，保持不设密码的一致性。
9. application-dev.yml / application-prod.yml 检查无额外冲突（当前简洁，保留即可）。

### 局部测试要求

| ID | 类型 | 条件 | 验证方式 |
|----|------|------|----------|
| T2-TR1 | rule | `snakeyaml` 或 IDE 验证 application.yml 合法，且 `routes` 节点的父节点为 `spring.cloud.gateway` | 手动检查 + 单元测试绑定 GatewayProperties |
| T2-TR2 | rule | `grep redis_EE7cM mall-gateway/src/main/resources/application.yml` 命中，`redis_EE7cMc` 不再出现 | grep |
| T2-TR3 | rule | `management.health.redis.enabled: false` 存在；Redis 断开时启动后 1 分钟无 RedisHealthIndicator ERROR 日志 | 启动日志检查 |
| T2-TR4 | rule | mall-monitor 路由存在，StripPrefix=1 | grep application.yml |
| T2-TR5 | rule | `show-values: when-authorized` 两处（env + configprops） | grep application.yml |
| T2-TR6 | rule | 外部 Nacos 配置文件密码与本地一致 | diff config/gateway/mall-gateway-dev.yaml 与 application.yml |
| T2-TR7 | rubric | 配置完整性（0-2），阈值 ≥ 1.5：含路由/Redis/健康检查/Actuator/限流熔断占位 5 个模块 | 手动审阅 |

**状态**：pending
**完成证据**：（实现时填写）

---

## Task 3：领域对象与配置属性类

**依赖关系**：Task 1
**优先级**：high
**覆盖 AC**：AC-R3、FR-1、FR-7、FR-5

### 任务描述
在 `domain` 子包创建以下类（均使用 Lombok）：

1. **`domain.AccessLog`**（访问日志领域对象）：
   - 字段：timestamp(Instant)、traceId(String)、method(String)、path(String)、sourceIp(String)、serviceId(String)、status(int)、durationMs(long)、requestSize(long)、responseSize(long)、userId(String, 可空)
   - `toJsonLog()` 方法返回一行 JSON 字符串（用 Jackson 或 Hutool）。

2. **`domain.RateLimitRule`**（限流规则）：
   - 字段：key(String)、replenishRate(int)、burstCapacity(int)、requestedTokens(int, 默认1)。

3. **`domain.IpFilterRule`**（IP 过滤规则）：
   - 字段：mode(enum ALLOW/DENY, 默认 DENY)、ips(List<String>, 支持 CIDR)。

在 `config` 子包创建以下 `@ConfigurationProperties` 类：

4. **`config.IpFilterProperties`**（`@ConfigurationProperties(prefix = "gateway.ip-filter")`）：
   - mode：字符串 whitelist/blacklist，默认 blacklist。
   - list：List\<String\>，IP/CIDR 列表，默认空。

5. **`config.SecurityHeadersProperties`**（`@ConfigurationProperties(prefix = "gateway.security-headers")`）：
   - enabled: boolean = true
   - 各项开关：contentTypeOptions、xssProtection、frameOptions、hsts、contentSecurityPolicy、referrerPolicy（boolean，默认 true）
   - cspDirective：String，默认 `default-src 'self'`

6. **`config.RequestSizeProperties`**（`@ConfigurationProperties(prefix = "gateway.request")`）：
   - maxSizeMb：int，默认 10
   - excludePaths：List\<String\>，默认空（如大文件上传路径）

7. **`config.GatewayRateLimitProperties`**（`@ConfigurationProperties(prefix = "gateway.rate-limit")`）：
   - enabled：boolean = true
   - adminRate：每秒令牌数（mall-admin），默认 100
   - adminBurst：突发容量，默认 200
   - portalRate：默认 200，portalBurst：默认 400
   - defaultKeyResolver：ip_path（可选 ip / path / user / ip_path）

8. **启动类加上 `@EnableConfigurationProperties`** 引入上述 4 个 Properties。
9. 修正 `IgnoreUrlsConfig`：增加 `@Validated` + 路径非空校验。

### 局部测试要求

| ID | 类型 | 条件 | 验证方式 |
|----|------|------|----------|
| T3-TR1 | rule | 所有 domain/config 类编译通过，可在 SpringBootTest 中成功绑定 | `@SpringBootTest` + `@Autowired IpFilterProperties` 断言非空 |
| T3-TR2 | rule | `AccessLog.toJsonLog()` 输出合法 JSON，字段完整 | 单元测试断言 JSON 包含 traceId/status/durationMs |
| T3-TR3 | rule | `@ConfigurationProperties` 绑定前缀正确，IDE Spring 配置元数据自动生成生效 | `mvn compile` 检查 `target/classes/META-INF/spring-configuration-metadata.json` |
| T3-TR4 | rubric | 配置类解耦度（0-2），阈值 ≥ 1.5：无硬编码，均有默认值，注释齐全 | 手动审阅 |

**状态**：pending
**完成证据**：（实现时填写）

---

## Task 4：鉴权重构 — 删除 StpMemberUtil 并优化 Sa-Token 配置

**依赖关系**：Task 1、Task 2
**优先级**：high
**覆盖 AC**：AC-R4、FR-11

### 任务描述
1. **删除** `util/StpMemberUtil.java`（1238行巨型类）。
2. **新增** `auth.StpMemberLoginType.java`：
   - 常量类：`public static final String TYPE = "memberLogin";`
   - 静态工厂方法：`public static StpLogic logic() { return SaManager.getStpLogic(TYPE); }`（若未注册则返回 `StpLogicJwtForSimple` 实例并 `SaManager.putStpLogic`）。
3. **新增** `auth.PermissionChecker.java`：
   - 依赖：`RedisTemplate<String, Object>`, `IgnoreUrlsConfig`。
   - 方法 `List<String> resolveRequiredPermissions(String requestPath)`：遍历 Redis Hash `PATH_RESOURCE_MAP`，AntPath 匹配返回所需权限列表。
   - 增加 Redis 不可用降级：catch RedisConnectionFailureException 返回空列表（仅登录校验）。
4. **移动并升级** `StpInterfaceImpl` 到 `auth.StpInterfaceImpl`：
   - 增加空值保护：`StpUtil.getSession() == null` 或 `session.get(STP_ADMIN_INFO) == null` 时返回 `Collections.emptyList()`（不抛 NPE）。
   - Javadoc 完整。
5. **重写** `SaTokenConfig` → `config.SaTokenAuthConfig`：
   - 删除直接 RedisTemplate 字段，注入 `PermissionChecker`。
   - `SaReactorFilter` 内部调用 `permissionChecker.resolveRequiredPermissions` 替代原内联 Redis 操作。
   - 异常处理委托给 `GlobalErrorWebExceptionHandler`（下一步实现）。
   - Order 确保鉴权在用户头透传（-50）之前执行（Sa-Token 默认 Filter order 足够早）。
6. **验证鉴权等价**：
   - 登录认证：`/mall-portal/**` → `StpMemberLoginType.logic().checkLogin()`
   - 管理认证：`/mall-admin/**` → `StpUtil.checkLogin()` + 权限列表匹配。

### 局部测试要求

| ID | 类型 | 条件 | 验证方式 |
|----|------|------|----------|
| T4-TR1 | rule | `util/StpMemberUtil.java` 文件不存在或 ≤ 50 行 | `wc -l` 或文件不存在 |
| T4-TR2 | rule | `StpInterfaceImpl.getPermissionList()` 在 session 无 adminInfo 时返回空列表（不抛 NPE） | MockSession 单元测试 |
| T4-TR3 | rule | `PermissionChecker.resolveRequiredPermissions()` 能正确匹配 AntPath（如 `/mall-admin/**` 匹配 `/mall-admin/user/1`） | 单元测试：Mock RedisTemplate 返回 PATH_RESOURCE_MAP，断言命中 |
| T4-TR4 | rule | `PermissionChecker` 在 Redis 抛异常时返回空列表，不向上抛出 | 模拟 RedisConnectionFailureException 单元测试 |
| T4-TR5 | rule | Spring 上下文启动时 SaReactorFilter Bean 注册成功 | 启动日志包含 "SaReactorFilter registered" 或上下文断言 Bean 存在 |
| T4-TR6 | rubric | 鉴权模块解耦度（0-2），阈值 ≥ 1.5：SaTokenAuthConfig 不直接访问 Redis，逻辑集中在 PermissionChecker | 代码依赖分析 |

**状态**：pending
**完成证据**：（实现时填写）

---

## Task 5：全局过滤器 — TraceId + 访问日志 + IP 黑白名单

**依赖关系**：Task 1、Task 3
**优先级**：high
**覆盖 AC**：AC-R5、AC-R8、AC-R10、FR-3、FR-4、FR-5

### 任务描述
在 `filter.global` 子包创建 3 个 GlobalFilter：

1. **`TraceIdGlobalFilter implements GlobalFilter, Ordered`**（Order = -100）：
   - 入站：从 `ServerWebExchange.getRequest().getHeaders().getFirst("X-Trace-Id")` 读取；为 null/空时用 `UUID.randomUUID().toString()` 生成。
   - 写入 Reactor Context：`.contextWrite(Context.of("traceId", traceId))`。
   - 响应：`exchange.getResponse().getHeaders().add("X-Trace-Id", traceId)`。
   - 工具类：同步创建 `util.TraceIdUtil`：`currentTraceId()` 从 Reactor Context 读取（Mono.deferContextual）。

2. **`AccessLogGlobalFilter implements GlobalFilter, Ordered`**（Order = -90）：
   - 构建 `AccessLog` 对象，大部分字段直接从 exchange 读取。
   - 请求/响应大小捕获：使用 `ServerHttpRequestDecorator`/`ServerHttpResponseDecorator` 包装 DataBuffer，累计 `readableByteCount()`。
   - 记录目标服务ID：从 exchange `GATEWAY_REQUEST_URL_ATTR` 或路由 URI host 获取。
   - 输出：`log.info(accessLog.toJsonLog())`。
   - 跳过：`/actuator/**`、`/webjars/**`、`/v3/api-docs/**`（白名单中包含的静态资源路径）。

3. **`IpBlacklistGlobalFilter implements GlobalFilter, Ordered`**（Order = -80）：
   - 注入 `IpFilterProperties`。
   - 实现 CIDR 匹配工具方法（支持 `192.168.1.0/24`）。使用 Hutool 的 `NetUtil` 或手写字节匹配。
   - 命中黑名单（mode=blacklist + 命中 list）→ 直接返回 403 `CommonResult.forbidden("IP blocked")`。
   - 命中白名单模式（mode=whitelist + 未命中 list）→ 同样 403。
   - 从请求获取源 IP：优先 `X-Forwarded-For` 首 IP，其次 `X-Real-IP`，最后 `remoteAddress`。

### 局部测试要求

| ID | 类型 | 条件 | 验证方式 |
|----|------|------|----------|
| T5-TR1 | rule | 无 TraceId 请求返回响应头 `X-Trace-Id`，且长度 36（UUID） | WebTestClient 集成测试 |
| T5-TR2 | rule | 有 TraceId 请求回显相同 TraceId 值 | WebTestClient 带 X-Trace-Id 头验证 |
| T5-TR3 | rule | AccessLog INFO 日志包含 traceId、method、path、status、durationMs 字段且 JSON 合法 | 启动 + curl 一次，检查日志文件 |
| T5-TR4 | rule | 黑名单模式 + 127.0.0.1 在列表 → 请求返回 403 + `CommonResult` JSON | WebTestClient + 配置 IP=127.0.0.1 |
| T5-TR5 | rule | 白名单模式 + 127.0.0.1 在列表 → 请求正常通过；其他 IP 403 | Mock IP（可使用测试配置指定 10.x.x.x 不在列表） |
| T5-TR6 | rule | CIDR `127.0.0.0/24` 正确匹配 IP `127.0.0.55`，不匹配 `127.0.1.1` | 单元测试 CIDR 工具方法 |
| T5-TR7 | rule | 过滤器 Order 正确（-100/-90/-80），可用 `@Order` 或 Ordered#getOrder 验证 | 单元测试反射读取 order 值 |
| T5-TR8 | rubric | 过滤器鲁棒性（0-2），阈值 ≥ 1.5：异常均被捕获不中断主流程 | 注入异常场景（log 失败、CIDR 解析错误）验证优雅降级 |

**状态**：pending
**完成证据**：（实现时填写）

---

## Task 6：全局过滤器 — 安全响应头 + 请求体大小限制 + 用户头透传

**依赖关系**：Task 1、Task 3、Task 4
**优先级**：high
**覆盖 AC**：AC-R5、AC-R9、AC-R11、FR-6、FR-9、FR-10

### 任务描述
在 `filter.global` 子包再创建 3 个 GlobalFilter：

1. **`SecurityHeadersGlobalFilter implements GlobalFilter, Ordered`**（Order = -70）：
   - 注入 `SecurityHeadersProperties`。
   - 在 `chain.filter(exchange).then(Mono.fromRunnable(() -> addHeaders(exchange)))` 中注入响应头。
   - 按属性开关分别注入：X-Content-Type-Options、X-XSS-Protection、Strict-Transport-Security、X-Frame-Options、Content-Security-Policy、Referrer-Policy。
   - HSTS 仅在请求 scheme = https 时注入（或强制开启，由配置决定）。

2. **`RequestSizeGlobalFilter implements GlobalFilter, Ordered`**（Order = -60）：
   - 注入 `RequestSizeProperties`。
   - 先检查 `Content-Length` 头（若存在且 > maxSize 直接 413）。
   - 分块传输：使用装饰器累计 DataBuffer 字节数，超过时抛 `ResponseStatusException(PAYLOAD_TOO_LARGE)`。
   - `excludePaths`（AntPath 匹配）跳过限制。

3. **`UserHeaderGlobalFilter implements GlobalFilter, Ordered`**（Order = -50，鉴权之后）：
   - 检查当前登录类型：
     - StpUtil.isLogin()（admin）：构建用户对象，从 Session 取 `UserDto`。
     - StpMemberLoginType.logic().isLogin()（member）：构建简化用户对象 { userId, loginType:"member" }。
   - 序列化为 JSON → Base64 编码 → 请求头 `X-Gateway-User`。
   - 未登录则不添加该头。
   - 注意：Sa-Token 在 Reactor 模式下需确保上下文可见（与 TraceId 过滤器协作，使用 Context 传递）。

### 局部测试要求

| ID | 类型 | 条件 | 验证方式 |
|----|------|------|----------|
| T6-TR1 | rule | 响应头至少包含 X-Content-Type-Options / X-XSS-Protection / X-Frame-Options 三项 | WebTestClient 断言响应头 |
| T6-TR2 | rule | `Content-Length: 11MB` 请求 → 返回 413；`Content-Length: 9MB` → 通过 | WebTestClient + 属性配置 |
| T6-TR3 | rule | excludePaths 配置的路径跳过大小限制 | 集成测试：配置 exclude `/upload`，发送 11MB 请求通过 |
| T6-TR4 | rule | 已登录 admin 请求下游收到 `X-Gateway-User` 头，Base64 解码后 JSON 包含 userId/username/loginType/permissionList | 模拟登录 + Mock 下游请求断言头 |
| T6-TR5 | rule | 未登录请求不包含 `X-Gateway-User` 头 | WebTestClient 无头断言 |
| T6-TR6 | rubric | 安全头与用户头可维护性（0-2），阈值 ≥ 1.5：所有头项通过配置开关而非硬编码 | 手动审阅 |

**状态**：pending
**完成证据**：（实现时填写）

---

## Task 7：限流 + 熔断过滤器

**依赖关系**：Task 1、Task 2、Task 3
**优先级**：high
**覆盖 AC**：AC-R6、AC-R7、FR-7、FR-8

### 任务描述
1. **限流过滤器** `filter.gateway.RateLimitGatewayFilterFactory extends AbstractGatewayFilterFactory<Config>`：
   - 内部 Config：replenishRate、burstCapacity、keyResolver（默认 ip_path）。
   - KeyResolver Bean（`config.RateLimitConfig`）：
     - `@Bean(name = "ipKeyResolver")` KeyResolver → 取源 IP。
     - `@Bean(name = "ipPathKeyResolver")` KeyResolver → IP + `exchange.getRequest().getURI().getPath()`。
   - 限流算法：使用 Redis Lua 脚本令牌桶（或直接使用 Spring Cloud Gateway 自带 `RedisRateLimiter`，但为了可控手写一份更短）。
   - 超限返回：HTTP 429，响应头 `Retry-After: 1`，响应体 `CommonResult.failed("Too many requests")`。
   - 在 `application.yml` 的 mall-admin / mall-portal / mall-ArticleSummary / mall-auth 路由上分别挂载 RateLimit 过滤器，使用 `GatewayRateLimitProperties` 中的速率配置。

2. **熔断配置** `config.Resilience4jConfig`：
   - 自定义 `CircuitBreakerConfig.Builder`：`slidingWindow(10, 10, COUNT_BASED)`、`failureRateThreshold(50)`、`waitDurationInOpenState(Duration.ofSeconds(30))`、`slowCallDurationThreshold(Duration.ofSeconds(5))`、`slowCallRateThreshold(60)`。
   - `@Bean` Customizer<ReactiveResilience4JCircuitBreakerFactory> 应用默认配置。
   - 降级回调：在路由 filters 中配置 `CircuitBreaker` 过滤器名 + fallbackUri，使用自定义降级处理器返回 `CommonResult.failed("Service temporarily unavailable")`，状态码 503。
   - 对所有业务路由启用：mall-admin / mall-portal / mall-search / mall-ArticleSummary / mall-auth。

### 局部测试要求

| ID | 类型 | 条件 | 验证方式 |
|----|------|------|----------|
| T7-TR1 | rule | 连续发送 N（> burst）个相同 IP+路径 请求，第 N+1 个返回 429 + Retry-After | WebTestClient 批量请求 |
| T7-TR2 | rule | 1s 冷却后再次发送请求，成功返回 200/预期业务码 | 同上 + Thread.sleep(1200) |
| T7-TR3 | rule | 限流过滤器 Redis 不可用时降级为放行（抛异常 catch 后直接 chain.filter） | Mock RedisTemplate 抛异常，验证请求不被阻塞 |
| T7-TR4 | rule | 模拟下游连续 5 个 500 返回，第 6 个请求触发熔断返回 503 + 服务不可用消息 | WireMock + WebTestClient |
| T7-TR5 | rule | 30s 后熔断器切换到半开状态，成功请求通过后关闭 | 同上，等待后重试 |
| T7-TR6 | rubric | 熔断限流效果合理性（0-2），阈值 ≥ 1.0：误杀率低，正常流量不被截断 | 手动压测：50 QPS 下观察不触发误限流 |

**状态**：pending
**完成证据**：（实现时填写）

---

## Task 8：全局异常处理器 + 自定义异常

**依赖关系**：Task 1、Task 4
**优先级**：high
**覆盖 AC**：AC-R12、AC-R17、FR-12

### 任务描述
1. **`exception.GatewayException extends RuntimeException`**：
   - 字段：code(int)、message(String)、data(Object, 可空)。
   - 覆盖多种常见场景构造函数。

2. **`exception.GlobalErrorWebExceptionHandler implements ErrorWebExceptionHandler, Ordered`**：
   - Order = -2（优先于 DefaultErrorWebExceptionHandler：-1）。
   - 使用 `@Order(-2)` 或实现 Ordered。
   - 异常映射表：
     - NotLoginException → 401 + `CommonResult.unauthorized(null)`
     - NotPermissionException / NotRoleException → 403 + `CommonResult.forbidden(null)`
     - NotSafeException / DisableServiceException → 403/自定义
     - ResponseStatusException → 取其 status + reason → `CommonResult.failed(reason)`
     - BlockedException（限流熔断 BlockedException）→ 429 / 503 判断 → 对应 `CommonResult.failed`
     - GatewayException → ex.code / message / data → `CommonResult`
     - 其他 Exception → 500 + `CommonResult.failed("Internal gateway error")`（详细 message 仅 DEBUG 堆栈打印）
   - 始终设置响应头：
     - Content-Type: application/json;charset=UTF-8
     - X-Trace-Id: 从 Reactor Context 或 exchange 属性读取
     - Cache-Control: no-cache
   - 响应序列化：使用 Jackson ObjectMapper 将 CommonResult 写为 JSON 字节流写入 DataBuffer。
   - 日志策略：DEBUG 级别打印堆栈；ERROR/INFO 级别仅打印 `[TraceId] ExceptionClass: Message` 单行摘要。

3. **在 Sa-Token Config 中保留的 setError 方法改为复用 GlobalErrorWebExceptionHandler 逻辑**（避免重复）。

### 局部测试要求

| ID | 类型 | 条件 | 验证方式 |
|----|------|------|----------|
| T8-TR1 | rule | 触发 NotLoginException → 响应码 401 + `CommonResult(code=401)` JSON | WebTestClient 访问需登录未带 token |
| T8-TR2 | rule | 触发 NotPermissionException → 403 + `CommonResult(code=403)` | 构造需权限路径访问无权限用户 |
| T8-TR3 | rule | 未知 RuntimeException → 500 + `CommonResult(code=500)`，响应体中无堆栈字符串 | 手动抛异常测试 |
| T8-TR4 | rule | 响应头 Content-Type 为 application/json，且包含 TraceId | 所有异常用例断言头 |
| T8-TR5 | rule | 日志中仅一行异常摘要（INFO/ERROR），DEBUG 环境才打印堆栈 | 日志级别 INFO 下检查无多行堆栈 |
| T8-TR6 | rubric | 异常覆盖全面性（0-2），阈值 ≥ 1.5：至少覆盖 6 种异常类型，未知异常兜底无泄漏 | 异常矩阵审阅 |

**状态**：pending
**完成证据**：（实现时填写）

---

## Task 9：跨域配置 + 其他配置类收尾

**依赖关系**：Task 1、Task 2、Task 3
**优先级**：medium
**覆盖 AC**：AC-R3、NFR-2、FR-1

### 任务描述
1. **保留并增强 `config.GlobalCorsConfig`**：
   - 保持现有宽松配置（Allow=* + AllowCredentials）。
   - 新增 CorsConfiguration 来源可配置（通过 `@ConfigurationProperties(prefix="gateway.cors")`，可选限制允许域名清单），默认维持兼容。
2. **`config.RedisConfig` 保持继承 BaseRedisConfig 不变**。
3. **新增 `config.Resilience4jConfig`**（Task 7 中的熔断配置）。
4. **新增 `config.RateLimitConfig`**（Task 7 中的 KeyResolver Bean）。
5. **启动类 MallGatewayApplication**：
   - 根包扫描 com.macro.mall.gateway（默认即可，因为启动类已移到根包）。
   - `@EnableDiscoveryClient` 保留。
   - `@EnableConfigurationProperties({IpFilterProperties.class, SecurityHeadersProperties.class, RequestSizeProperties.class, GatewayRateLimitProperties.class})` 显式声明。

### 局部测试要求

| ID | 类型 | 条件 | 验证方式 |
|----|------|------|----------|
| T9-TR1 | rule | 跨域预检 OPTIONS 返回 200 + Allow-Origin/Headers/Methods/Credentials 头 | curl OPTIONS 验证 |
| T9-TR2 | rule | 所有配置类作为 Bean 成功注册，启动无 BeanCreationException | SpringBootTest 上下文加载 |
| T9-TR3 | rule | RedisTemplate Bean 可正常注入（即使 Redis 不可用也不影响上下文） | 断开 Redis 启动，上下文正常加载 |
| T9-TR4 | rubric | 配置类一致性（0-2），阈值 ≥ 1.5：统一使用 @ConfigurationProperties，无散落 @Value | 全文 grep @Value 统计（允许 ≤ 2 处） |

**状态**：pending
**完成证据**：（实现时填写）

---

## Task 10：单元测试与集成测试补充

**依赖关系**：Task 1-9 全部完成
**优先级**：high
**覆盖 AC**：AC-R15、AC-R2

### 任务描述
创建以下测试类（src/test/java/com/macro/mall/gateway）：

1. **`config.IgnoreUrlsConfigTest`**：
   - `@SpringBootTest(properties = {secure.ignore.urls[0]=/a, secure.ignore.urls[1]=/b/**})`
   - 断言 size=2，AntPath 匹配 `/b/1`。

2. **`auth.PermissionCheckerTest`**：
   - Mock RedisTemplate.opsForHash().entries 返回若干 path-resource 对。
   - 断言 AntPath 命中、未命中、Redis 异常降级 3 个用例。

3. **`filter.global.IpBlacklistGlobalFilterTest`**：
   - 测试 blacklist 模式 + CIDR 匹配（127.0.0.0/24 匹配 127.0.0.55）。
   - 测试 whitelist 模式 + 非白名单 IP 拒绝。
   - Mock ServerWebExchange（WebTestClient.bindToWebHandler）。

4. **`filter.global.TraceIdGlobalFilterTest`**：
   - 无请求头 → 生成 36 字符 UUID。
   - 有请求头 → 回显完全一致。
   - 使用 `MockServerWebExchange`。

5. **`filter.gateway.RateLimitGatewayFilterTest`**：
   - Mock RedisScript 执行返回拒绝/通过两种情况。
   - 断言 429 + Retry-After 头。
   - Redis 异常 → 放行。

6. **`exception.GlobalErrorWebExceptionHandlerTest`**：
   - 使用 WebTestClient.bindToController(...).controllerAdvice(GlobalErrorWebExceptionHandler.class)
   - 抛 NotLogin → 401；抛 NotPermission → 403；抛 RuntimeException → 500；抛 ResponseStatus(413) → 413。
   - 响应体 JSON 解析成功，code/message 字段正确。

7. **轻量集成测试 `MallGatewayApplicationTests`**：
   - `@SpringBootTest(webEnvironment = MOCK, properties = {spring.cloud.nacos.enabled=false, spring.data.redis.host=nonexistent.invalid})`
   - 验证 ApplicationContext 加载成功（即使 Nacos/Redis 不可用也需启动）。
   - 断言所有 GlobalFilter Bean 已注册（`applicationContext.getBeansOfType(GlobalFilter.class).size() >= 6`）。

8. 使用 JaCoCo 或 IDEA 覆盖率工具统计模块总体覆盖率，目标 ≥ 60%。

### 局部测试要求

| ID | 类型 | 条件 | 验证方式 |
|----|------|------|----------|
| T10-TR1 | rule | 7 个测试类存在并命名一致 | `find src/test -name '*Test.java'` 统计 |
| T10-TR2 | rule | `mvn -pl mall-gateway test` 全部通过（0 failures, 0 errors） | Maven surefire 报告 |
| T10-TR3 | rule | 模块级单元测试覆盖率 ≥ 60%（整体） | JaCoCo report 或 IDE Coverage 统计 |
| T10-TR4 | rule | MallGatewayApplicationTests 在 Redis/Nacos 不可用时仍通过（关键降级测试） | 单独运行该测试类 + 显式无效地址配置 |
| T10-TR5 | rubric | 测试质量（0-2），阈值 ≥ 1.5：边界条件覆盖（空值/异常/降级），非 happy-path 占比>30% | 手动审阅用例列表统计 |

**状态**：pending
**完成证据**：（实现时填写）

---

## Task 11：端到端验证与回归测试

**依赖关系**：Task 1-10 完成，编译/测试全部通过
**优先级**：high
**覆盖 AC**：全部 AC（特别是 AC-U5 兼容性、AC-U6 性能）

### 任务描述
1. **启动冒烟测试**：
   - 运行 `mvn -pl mall-gateway spring-boot:run -Dspring-boot.run.profiles=dev`（即使 Redis/Nacos 不可用也要能启动，仅功能降级）。
   - 访问 `curl http://localhost:8201/actuator/gateway/routes` 应返回 JSON 路由列表，包含 mall-monitor。
   - 访问 `curl -I http://localhost:8201/mall-admin/admin/login`（不需登录的白名单路径），检查响应头（安全响应头、TraceId）。
2. **功能回归**（若有后端环境）：
   - 验证 mall-admin 登录 token 生成流程仍可用。
   - 验证 mall-portal 注册/获取验证码接口白名单放行。
   - 对比重写前 curl 记录（如保留）确保返回结构一致。
3. **文档检查**：所有新增公共类/方法 JavaDoc ≥ 90% 覆盖率（spot-check 5 个类）。
4. **日志检查**：启动后等待 1 分钟无 Redis 健康检查 ERROR 日志刷屏。
5. **编译产物**：`mvn -pl mall-gateway -DskipTests package` 成功生成 JAR。

### 局部测试要求

| ID | 类型 | 条件 | 验证方式 |
|----|------|------|----------|
| T11-TR1 | rule | JAR 打包成功，大小在合理范围（< 100MB 通常 OK） | `ls -lh target/mall-gateway-*.jar` |
| T11-TR2 | rule | `/actuator/gateway/routes` 返回包含 mall-monitor 路由 | curl |
| T11-TR3 | rule | 响应头中包含 X-Trace-Id + 至少 3 项安全头 | curl -I |
| T11-TR4 | rule | 启动 1 分钟内无 RedisConnectionFailureException + HealthIndicator 相关 ERROR | 日志搜索关键词 |
| T11-TR5 | rule | `env` 端点敏感属性（spring.data.redis.password）显示为 `******` | curl /actuator/env |
| T11-TR6 | rubric | 回归兼容性（0-2），阈值 ≥ 2.0：典型 mall-portal/mall-admin 调用 0 失败 | 历史用例对照 |
| T11-TR7 | rubric | 启动时间无显著劣化（0-2），阈值 ≥ 1.0：相对原网关增加 < 5s | 日志 Started 时间差对比 |

**状态**：pending
**完成证据**：（实现时填写）

---

## 任务执行顺序建议

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11
         \__________/   \____________________/
           可部分并行          可部分并行
```

- **T1-T3（基础）**：必须先完成，依赖这些才能写过滤器。
- **T4（鉴权重构）**：独立于 T5/T6，但 Sa-Token 异常和 T8 异常处理器有关联，建议在 T8 前完成。
- **T5-T7（过滤器）**：内部可并行，只要 T3 的配置类已就绪。
- **T8（异常）**：需在 T4 鉴权重构之后，因为要复用 NotLoginException 定义。
- **T9（收尾配置）**：可穿插在 T5-T8 之间。
- **T10（测试）**：每个功能 Task 完成后即可补对应单测，不必等全部。
- **T11（E2E）**：全部 Task 完成后进行。

---

## AC 覆盖矩阵

| Acceptance Criterion | 覆盖 Task |
|----------------------|-----------|
| AC-R1 (yml层级正确) | T2 |
| AC-R2 (启动无异常) | T10, T11 |
| AC-R3 (包结构符合FR-1) | T1, T3, T4, T5, T6, T7, T8, T9 |
| AC-R4 (删除StpMemberUtil) | T4 |
| AC-R5 (8过滤器+Order正确) | T5, T6, T7 |
| AC-R6 (限流429) | T7, T10 |
| AC-R7 (熔断503) | T7, T10 |
| AC-R8 (IP黑名单403) | T5, T10 |
| AC-R9 (安全响应头) | T6, T11 |
| AC-R10 (TraceId生成/回显) | T5, T10 |
| AC-R11 (X-Gateway-User头) | T6, T10 |
| AC-R12 (异常映射) | T8, T10 |
| AC-R13 (禁用Redis健康检查) | T2, T11 |
| AC-R14 (Actuator隐藏敏感值) | T2, T11 |
| AC-R15 (覆盖率≥60%) | T10 |
| AC-R16 (mall-monitor路由) | T2, T11 |
| AC-R17 (过滤器异常捕获) | T5, T6, T7, T8 |
| AC-U1 (架构分层) | T1, T3, T4 |
| AC-U2 (可配置性) | T3, T9 |
| AC-U3 (可维护性/JavaDoc) | 全部 Task + T11 |
| AC-U4 (降级容错) | T4, T5, T7 + T10/T11 |
| AC-U5 (向后兼容) | T2, T4 + T11 |
| AC-U6 (性能影响) | T11 |
