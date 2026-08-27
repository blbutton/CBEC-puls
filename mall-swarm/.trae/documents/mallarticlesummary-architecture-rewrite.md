# mall-ArticleSummary 架构级彻底重写 计划

## Summary
将 `com.mars.boot4.mallarticlesummary` 整个包从"扁平 CRUD + 残留 JPA"重写为 **DDD 分层架构**（domain / application / infrastructure / interfaces 四层 + shared 内核），覆盖 Article / News / Paper / Member 四个模块。引入富领域实体、端口/适配器（仓储端口在 domain、MyBatis 适配器在 infrastructure）、用例编排（ApplicationService）、命令/查询/DTO 分离、全局异常处理、统一参数校验、Web 边界装配器。数据库按用户明确指定使用 **MySQL**（与项目记忆中 PostgreSQL 硬约束偏离，见 Assumptions）。

执行后产物：可编译、可启动、`contextLoads` 自包含通过（H2 MySQL 模式测试 profile）、四模块 REST + Swagger 全覆盖、Member 与其余三模块结构一致。

---

## Current State Analysis（基于 Phase 1 探索）

### 包结构与现状
- 顶层 `controller/`：ArticleController、NewsController、PaperController（无 MemberController）
- 顶层 `service/` + `service/impl/`：Article/News/Paper 三套（MyBatis + PageHelper）
- 顶层 `dao/`：ArticleDao、MemberDao、NewsDao、PaperDao（MyBatis 接口，含 `@Param`）
- 顶层 `model/`：Article、News、Paper（已完整）、Member（上轮已填充 15 字段）
- 顶层 `dto/`：ArticleParam、NewsParam、PaperParam、MemberParam（`@Data + @Schema + @NotEmpty`）
- 顶层 `config/PersistenceConfig`：`@Configuration @Profile("!webtest") @MapperScan("...dao")`
- `Member/` 子包：上轮已重写为 MyBatis（controller/service/Impl），但留在子包，Swagger 不覆盖
- 入口 `MallArticleSummaryApplication`：`@SpringBootApplication + @EnableDiscoveryClient`，默认扫描根包

### 资源/配置
- `resources/dao/*.xml`：ArticleDao.xml、NewsDao.xml、PaperDao.xml、MemberDao.xml —— SQL 可移植（COALESCE/CURRENT_TIMESTAMP/CONCAT/LIKE/IN，无反引号/REPLACE INTO），MySQL 8 兼容
- `application.yml`：MySQL 数据源 `jdbc:mysql://192.168.100.137:3306/mall`，**驱动类 `com.mysql.jdbc.Driver`（已废弃，应为 `com.mysql.cj.jdbc.Driver`）**；含 `spring.jpa.hibernate.ddl-auto: update`（JPA，现已无 `@Entity`，残留无用）；`mybatis.mapper-locations: classpath:dao/*.xml`；springdoc `packages-to-scan: com.mars.boot4.mallarticlesummary.controller`（仅顶层，漏 Member）
- `application-dev.yml`：Nacos discovery + config import，正常

### pom.xml 依赖
- 保留且需要：`mall-common`、`spring-boot-starter-web`、`spring-cloud-commons`、nacos discovery/config、`mybatis-spring-boot-starter`、`pagehelper-spring-boot-starter`、`druid-spring-boot-3-starter`、sa-token 全家桶、`commons-pool2`、`spring-boot-admin-starter-client`、`spring-boot-starter-test`、`h2`(test)、`mysql-connector-j`(runtime)
- ⚠️ 残留需移除：`spring-boot-starter-data-jpa`（重写后无 JPA 实体，DDD 用 MyBatis）
- ⚠️ 缺失：无（MySQL 驱动已有；MyBatis 已有）

### 测试
- 仅 `MallArticleSummaryApplicationTests.contextLoads`（`@SpringBootTest`），依赖外部 MySQL 192.168.100.137，离线无法通过

### 关键问题
1. JPA 依赖与 `spring.jpa` 配置残留，与 MyBatis 双轨
2. MySQL 驱动类名过时
3. Member 模块结构与三模块不一致（子包 vs 顶层），Swagger 漏覆盖
4. 无全局异常处理 / 无 `@Valid` 校验落地 / 无 DTO 转换层
5. 测试不自包含

---

## Target Architecture（DDD 分层）

根包：`com.mars.boot4.mallarticlesummary`

```
com.mars.boot4.mallarticlesummary
├── MallArticleSummaryApplication.java
├── shared/                                 # 内核(跨模块)
│   ├── exception/
│   │   ├── ErrorCode.java                  # 错误码枚举
│   │   ├── BusinessException.java          # 业务异常基类(含 code+message)
│   │   ├── EntityNotFoundException.java     # 实体未找到
│   │   └── GlobalExceptionHandler.java     # @RestControllerAdvice(统一异常→CommonResult)
│   ├── web/
│   │   ├── ResponseAssembler.java          # 隔离 mall-common: 成功/失败→CommonResult
│   │   └── PageAssembler.java              # 隔离 PageHelper+mall-common: List→CommonPage
│   └── converter/
│       └── BiConverter.java                # 通用双向转换接口(S↔T)
│
├── article/   (News/Paper/Member 同构)
│   ├── domain/
│   │   ├── model/Article.java              # 富领域实体(@Data+@Schema, 字段对齐表)
│   │   └── port/ArticleRepository.java     # 仓储端口: save/findById/findAll(Page)/deleteById/deleteByIds/updateStatus
│   ├── application/
│   │   ├── ArticleApplicationService.java  # 用例编排(注入 port): create/update/delete/list/get/updateStatus
│   │   ├── command/CreateArticleCommand.java
│   │   ├── command/UpdateArticleCommand.java
│   │   ├── query/ArticleQuery.java         # keyword,status,pageNum,pageSize
│   │   └── dto/ArticleDto.java             # 出参
│   ├── infrastructure/persistence/
│   │   ├── ArticleMapper.java              # @Mapper(MyBatis, 原 Dao 签名保持)
│   │   └── ArticleRepositoryAdapter.java   # @Repository, 实现 ArticleRepository 端口,委托 Mapper
│   └── interfaces/
│       ├── ArticleController.java           # @RestController+@Tag+@RequestMapping("/article")
│       ├── request/CreateArticleRequest.java
│       ├── request/UpdateArticleRequest.java
│       └── ArticleWebAssembler.java         # Request→Command, ArticleDto→响应(经 ResponseAssembler)
│
├── news/      # 同 article 模板,表 art_news
├── paper/     # 同 article 模板,表 art_paper
└── member/    # 同 article 模板,表 art_member (从旧 Member/ 子包上移重写)
```

### 分层原则
- **domain**：纯 POJO，无 Spring/MyBatis/mall-common 依赖；端口为接口，由 infrastructure 实现
- **application**：依赖端口（非具体 Mapper）；编排用例；输入 command、输出 dto
- **infrastructure**：`@Mapper`/`@Repository`；实现端口；持有 MyBatis 映射；领域实体直接作持久化对象（无需独立 DO，与现状一致）
- **interfaces**：`@RestController`；`@Valid` 校验；mall-common `CommonResult`/`CommonPage` 仅在此层出现（经 Assembler）；Request→Command、Dto→响应
- **shared**：跨模块复用的异常、响应装配、转换接口

### 持久化映射
- Mapper 接口标注 `@Mapper`（org.apache.ibatis.annotations.Mapper），MyBatis 自动发现，**删除 `@MapperScan`/`PersistenceConfig`**
- Mapper XML 迁至 `resources/mapper/*.xml`（命名空间改为新 `*.infrastructure.persistence.{Module}Mapper`），`application.yml` 改 `mybatis.mapper-locations: classpath:mapper/*.xml`
- SQL 保持现有 MySQL 兼容写法不变（仅调整 namespace 与 `parameterType` 的全限定类名）

---

## Proposed Changes（按层）

### A. shared 内核（新建）
- `shared/exception/ErrorCode.java`：枚举 `ENTITY_NOT_FOUND, PARAM_INVALID, BUSINESS_ERROR, UNAUTHORIZED`
- `shared/exception/BusinessException.java`：`extends RuntimeException`，持 `ErrorCode code` + `String message`
- `shared/exception/EntityNotFoundException.java`：`extends BusinessException`，构造 `(Long id, String entity)`
- `shared/exception/GlobalExceptionHandler.java`：`@RestControllerAdvice`；处理 `BusinessException`→`CommonResult.failed(msg)`、`MethodArgumentNotValidException`→`CommonResult.validateFailed(bind)`、`Throwable`→`CommonResult.failed("系统异常")`
- `shared/web/ResponseAssembler.java`：静态 `ok(data)`/`okCount(int)`/`fail()` 包 `CommonResult`，隔离 mall-common
- `shared/web/PageAssembler.java`：静态 `page(List)` 包 `CommonPage.restPage(...)`
- `shared/converter/BiConverter.java`：`interface BiConverter<S,T>{ T to(S); S from(T); }`

### B. 各模块（Article / News / Paper / Member 同构，以 Article 为模板）
**domain**
- `article/domain/model/Article.java`：迁移自 `model/Article.java`（字段不变，补 `@Schema`，可加工厂 `create(...)` 与校验方法；本轮保持字段集不变以与表对齐）
- `article/domain/port/ArticleRepository.java`：接口 `save(Article):Article`、`findById(Long):Article`、`findAll(ArticleQuery):List<Article>`（分页由 application 层 `PageHelper.startPage` 触发）、`deleteById(Long)`、`deleteByIds(List<Long>)`、`updateStatus(List<Long>,Integer)`

**application**
- `article/application/command/CreateArticleCommand.java`、`UpdateArticleCommand.java`：`@Data`，字段同现 `ArticleParam`（去掉校验注解，校验在 Request 层）
- `article/application/query/ArticleQuery.java`：`keyword,status,pageNum,pageSize`
- `article/application/dto/ArticleDto.java`：`@Data`，字段同 `model/Article`（出参）
- `article/application/ArticleApplicationService.java`：`@Service`；注入 `ArticleRepository`；方法：`create(cmd)`（new Article + copy + save）、`update(id,cmd)`（findById 抛 `EntityNotFoundException` 或直接 selective update）、`delete(id)`、`list(query)`（`PageHelper.startPage` + findAll）、`get(id)`、`updateStatus(ids,status)`；用 `BeanUtils.copyProperties(cmd, entity)`

**infrastructure**
- `article/infrastructure/persistence/ArticleMapper.java`：`@Mapper`，签名同现 `ArticleDao`（insert/updateByPrimaryKeySelective/deleteByPrimaryKey/deleteByIds/selectByPrimaryKey/selectListByPage/updateStatusByIds，`@Param` 保持）
- `article/infrastructure/persistence/ArticleRepositoryAdapter.java`：`@Repository`，`implements ArticleRepository`；注入 `ArticleMapper`；实现端口方法委托 Mapper

**interfaces**
- `article/interfaces/request/CreateArticleRequest.java`、`UpdateArticleRequest.java`：`@Data`，字段同现 `ArticleParam`（含 `@NotEmpty`/`@Schema` 校验注解）
- `article/interfaces/ArticleWebAssembler.java`：Request→Command、`model/Article`→`ArticleDto`（`BeanUtils.copyProperties`）
- `article/interfaces/ArticleController.java`：`@RestController @Tag @RequestMapping("/article")`；`@Autowired ArticleApplicationService`；端点签名同现 `ArticleController`（create/update/{id}/delete/{id}/delete/batch/list/{id}/update/status）；入参 `@Valid @RequestBody ...Request`；经 `ArticleWebAssembler`→command 调 service；返回 `ResponseAssembler.ok(...)` / `PageAssembler.page(...)`

**News / Paper**：套同一模板，字段与表名沿用现 `model/News`、`model/Paper` 与 `NewsDao.xml`、`PaperDao.xml`。

**Member**：套同一模板（`member/...`），从旧 `Member/` 子包上移；字段沿用现 `model/Member` 与 `MemberDao.xml`。删除旧 `Member/` 子包全部内容。

### C. 资源/配置变更
- `resources/dao/*.xml` → 迁至 `resources/mapper/*.xml`（4 个文件），更新 `namespace` 为 `...{module}.infrastructure.persistence.{Module}Mapper`，`parameterType` 改新领域实体全限定名
- `application.yml`：
  - 数据源驱动 `com.mysql.jdbc.Driver` → `com.mysql.cj.jdbc.Driver`（保持 MySQL URL/账号）
  - 删除 `spring.jpa.*` 段（JPA 移除）
  - `mybatis.mapper-locations` → `classpath:mapper/*.xml`
  - `springdoc.group-configs[0].packages-to-scan` → `com.mars.boot4.mallarticlesummary`（覆盖所有 `*.interfaces` 子包）
- `pom.xml`：删除 `spring-boot-starter-data-jpa` 依赖块
- 删除 `config/PersistenceConfig.java`（改用 `@Mapper` 注解，无需 `@MapperScan`）

### D. 旧文件清理（删除）
- 顶层 `controller/`（ArticleController/NewsController/PaperController）→ 由新 `*.interfaces.*Controller` 取代
- 顶层 `service/`、`service/impl/`（Article/News/Paper 三套）→ 由新 `*.application.*ApplicationService` 取代
- 顶层 `dao/`（4 个 Dao 接口）→ 由新 `*.infrastructure.persistence.*Mapper` 取代
- 顶层 `model/`（4 个）→ 迁入各 `*.domain.model`
- 顶层 `dto/`（4 个 Param）→ 拆入各 `*.interfaces.request`
- `Member/` 整个子包
- `config/PersistenceConfig.java`

### E. 测试策略
- `MallArticleSummaryApplicationTests` 加 `@ActiveProfiles("test")`
- 新建 `src/test/resources/application-test.yml`：H2 MySQL 兼容模式
  ```
  spring:
    datasource:
      url: jdbc:h2:mem:mall;MODE=MySQL;DB_CLOSE_DELAY=-1
      driver-class-name: org.h2.Driver
      username: sa; password:
  ```
  （contextLoads 仅装载上下文，不执行 SQL，无需建表；PageHelper/mapper bean 正常装载）
- 可选 `src/test/resources/schema.sql`：4 表 MySQL 建表，供将来真跑查询的测试（本轮 contextLoads 不需要）

---

## Assumptions & Decisions
1. **数据库 = MySQL**：用户在本计划中明确指定"数据库用mysql"，覆盖项目记忆中"必须 PostgreSQL 16"硬约束。按"当前用户明确指令优先"原则执行。Mapper XML 现有写法（COALESCE/CURRENT_TIMESTAMP/CONCAT）MySQL 8 兼容，无需改 SQL 方言。
2. **领域实体 = 持久化对象**：本轮不为每模块单独建 DO，领域实体直接作 MyBatis `parameterType`/`resultMap type`（与现状一致，减少样板）。如后续需隔离可再拆。
3. **PageHelper 仍放 application 层**：`PageHelper.startPage` 在 ApplicationService 的 `list` 内调用（端口 `findAll` 只查列表），保持与现状一致的物理分页。
4. **mall-common 仅在 interfaces 层出现**：`CommonResult`/`CommonPage` 经 `ResponseAssembler`/`PageAssembler` 隔离，不渗入 domain/application。
5. **删除 PersistenceConfig + 改 `@Mapper`**：避免 `@MapperScan` 扫到 domain 端口接口（非 mapper）导致代理失败；`@Mapper` 精确标注。
6. **Member 上移**：从 `Member/` 子包迁入顶层 `member/` 四层结构，与三模块完全一致。
7. **富模型克制**：本轮聚焦分层与边界，领域实体保持字段集不变（与表对齐），不引入大范围领域行为方法，避免过度设计。

---

## Execution Order（分阶段，每阶段后 `mvn -q compile` 验证）
1. **infra 清理**：pom 删 JPA；application.yml 修驱动/删 jpa 段/mapper-locations/swagger-scan；删 PersistenceConfig → 编译
2. **shared 内核**：建 exception/web/converter 全套 → 编译
3. **Article 模块**（模板首发）：domain→application→infrastructure→interfaces 四层 + 迁 ArticleMapper.xml → 编译
4. **News 模块**：套模板 → 编译
5. **Paper 模块**：套模板 → 编译
6. **Member 模块**：套模板 + 删旧 `Member/` 子包 → 编译
7. **旧顶层清理**：删 controller/service/impl/dao/model/dto 旧文件 → 编译
8. **测试**：`@ActiveProfiles("test")` + `application-test.yml` → `mvn -q test -Dtest=MallArticleSummaryApplicationTests`

---

## Verification Steps
- 每阶段：`mvn -q clean compile -DskipTests`（exit 0）
- 终态：`mvn -q clean test -Dtest=MallArticleSummaryApplicationTests`（contextLoads 通过，H2 自包含）
- 结构校验：`target/classes/com/mars/boot4/mallarticlesummary/` 下应为 `article/news/paper/member/shared` 子包，无旧顶层 `controller/service/dao/model/dto` 与 `Member/` 残留
- Swagger：`springdoc.packages-to-scan` 覆盖四模块 `*.interfaces`
