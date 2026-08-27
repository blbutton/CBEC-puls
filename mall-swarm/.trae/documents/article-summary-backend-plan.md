# 文章管理后端接口实现计划（mall-ArticleSummary）

## 摘要

在 `mall-ArticleSummary` 模块中实现文章（article）、论文（paper）、新闻（news）、内容订阅会员（member）四类实体的后台管理 CRUD 接口。遵循项目既有分层架构（controller → service → dao → mapper xml），复用 `mall-common` 的 `CommonResult`/`CommonPage` 通用返回与分页，接入 Nacos 注册中心与配置中心、Sa-Token（JWT）后台鉴权、Knife4j 文档，并通过网关路由暴露服务。

**关键约束（来自项目记忆）**：数据库使用 PostgreSQL 16（非 MySQL），消息队列使用 Kafka（本模块暂不需要 MQ）。MyBatis Mapper XML 必须避免 MySQL 专有语法（无反引号、无 `REPLACE INTO`、用 `INSERT ... ON CONFLICT`、用 PostgreSQL 日期函数）。

**用户已确认范围**：
- 「会员」= 内容订阅会员（管理可阅读付费内容的用户：会员等级、订阅状态、到期时间、权益）。
- 鉴权范围 = 纯后台管理接口（所有接口走网关 + Sa-Token 管理员鉴权，无公开读取接口）。

---

## 当前状态分析

### 模块现状
- 包名：`com.mars.boot4.mallarticlesummary`（与项目其他模块的 `com.macro.mall` 不同，保留不改）。
- 启动类 `MallArticleSummaryApplication` 已有 `@EnableDiscoveryClient`。
- `pom.xml` 仅含 `spring-boot-starter-web` + `spring-cloud-commons`，缺少 MyBatis/Druid/Nacos/Sa-Token/Knife4j/PG 驱动等依赖。
- `application.yaml` 仅含 `spring.application.name`，无端口/数据源/注册中心配置。
- 无任何 controller/service/dao/model/config 业务代码。
- 根 `pom.xml` 的 `<modules>` 已包含 `mall-ArticleSummary`。

### 参考模式（来自 Phase 1 探查）
- 分层：`controller` / `service` + `service.impl` / `dao` / `dto` / `config`，参考 [PmsBrandController.java](file:///d:/1/sb/1/mall-swarm/mall-admin/src/main/java/com/macro/mall/controller/PmsBrandController.java) 与 [PmsBrandServiceImpl.java](file:///d:/1/sb/1/mall-swarm/mall-admin/src/main/java/com/macro/mall/service/impl/PmsBrandServiceImpl.java)。
- 手写 Dao + XML：参考 [PmsSkuStockDao.java](file:///d:/1/sb/1/mall-swarm/mall-admin/src/main/java/com/macro/mall/dao/PmsSkuStockDao.java) 与 [PmsSkuStockDao.xml](file:///d:/1/sb/1/mall-swarm/mall-admin/src/main/resources/dao/PmsSkuStockDao.xml)（注意其 `REPLACE INTO` 为 MySQL 语法，本模块改用 PG 的 `ON CONFLICT`）。
- 通用返回：[CommonResult.java](file:///d:/1/sb/1/mall-swarm/mall-common/src/main/java/com/macro/mall/common/api/CommonResult.java)、[CommonPage.java](file:///d:/1/sb/1/mall-swarm/mall-common/src/main/java/com/macro/mall/common/api/CommonPage.java)（`CommonPage.restPage(list)`）。
- 配置参考：[MyBatisConfig.java](file:///d:/1/sb/1/mall-swarm/mall-admin/src/main/java/com/macro/mall/config/MyBatisConfig.java)、[SaTokenConfigure.java](file:///d:/1/sb/1/mall-swarm/mall-admin/src/main/java/com/macro/mall/config/SaTokenConfigure.java)、[SpringDocConfig.java](file:///d:/1/sb/1/mall-swarm/mall-admin/src/main/java/com/macro/mall/config/SpringDocConfig.java)。
- 网关路由：[mall-gateway/application.yml](file:///d:/1/sb/1/mall-swarm/mall-gateway/src/main/resources/application.yml)（`spring.cloud.gateway.server.webflux.routes` + `secure.ignore.urls`）。

### 关键决策
1. **不依赖 `mall-mbg`**：避免引入 MySQL 驱动与生成器，直接使用手写 Dao + XML，SQL 全部为 PostgreSQL 兼容语法。依赖 `mall-common` 获取通用工具与 PageHelper。
2. **包名保留** `com.mars.boot4.mallarticlesummary`，子包：`controller/service/service.impl/dao/model/dto/config`。
3. **表前缀** `art_`，置于既有 `mall` PostgreSQL 库中。仅 4 张主表，不额外拆会员等级表（等级以字段存于 member 表，避免过度设计）。
4. **PG 驱动版本**：Spring Boot 父 POM 已托管 `org.postgresql:postgresql`，模块 pom 无需写版本号。
5. **端口**：8090（避免与 mall-admin 8080、gateway 8201 冲突）。

---

## 数据库表设计（PostgreSQL）

新增 SQL 脚本：`document/sql/article_summary.sql`（PostgreSQL 语法，主键用 `BIGSERIAL`，时间默认 `CURRENT_TIMESTAMP`）。

### 1. art_article（文章）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGSERIAL PK | 主键 |
| title | VARCHAR(255) NOT NULL | 标题 |
| summary | TEXT | 摘要 |
| content | TEXT | 正文 |
| cover_image | VARCHAR(500) | 封面图 URL |
| author | VARCHAR(100) | 作者 |
| category | VARCHAR(50) | 分类 |
| tags | VARCHAR(255) | 标签(逗号分隔) |
| view_count | INTEGER DEFAULT 0 | 浏览量 |
| like_count | INTEGER DEFAULT 0 | 点赞数 |
| sort | INTEGER DEFAULT 0 | 排序 |
| status | SMALLINT DEFAULT 0 | 0未发布 1已发布 2下架 |
| is_top | SMALLINT DEFAULT 0 | 是否置顶 |
| publish_time | TIMESTAMP | 发布时间 |
| create_time | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| update_time | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | 更新时间 |

### 2. art_paper（论文）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGSERIAL PK | 主键 |
| title | VARCHAR(255) NOT NULL | 标题 |
| abstract_text | TEXT | 摘要 |
| content | TEXT | 正文 |
| authors | VARCHAR(500) | 作者列表 |
| keywords | VARCHAR(255) | 关键词 |
| journal | VARCHAR(200) | 期刊/会议 |
| doi | VARCHAR(100) | DOI |
| pdf_url | VARCHAR(500) | PDF 链接 |
| publish_year | INTEGER | 发表年份 |
| category | VARCHAR(50) | 学科分类 |
| view_count | INTEGER DEFAULT 0 | 浏览量 |
| download_count | INTEGER DEFAULT 0 | 下载量 |
| sort | INTEGER DEFAULT 0 | 排序 |
| status | SMALLINT DEFAULT 0 | 0未发布 1已发布 2下架 |
| publish_time | TIMESTAMP | 发布时间 |
| create_time | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| update_time | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | 更新时间 |

### 3. art_news（新闻）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGSERIAL PK | 主键 |
| title | VARCHAR(255) NOT NULL | 标题 |
| summary | TEXT | 摘要 |
| content | TEXT | 正文 |
| cover_image | VARCHAR(500) | 封面图 |
| source | VARCHAR(100) | 来源 |
| author | VARCHAR(100) | 作者 |
| category | VARCHAR(50) | 分类 |
| view_count | INTEGER DEFAULT 0 | 浏览量 |
| sort | INTEGER DEFAULT 0 | 排序 |
| status | SMALLINT DEFAULT 0 | 0未发布 1已发布 2下架 |
| is_top | SMALLINT DEFAULT 0 | 是否置顶 |
| publish_time | TIMESTAMP | 发布时间 |
| create_time | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| update_time | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | 更新时间 |

### 4. art_member（内容订阅会员）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGSERIAL PK | 主键 |
| username | VARCHAR(100) NOT NULL | 用户名 |
| phone | VARCHAR(20) | 手机号 |
| email | VARCHAR(100) | 邮箱 |
| avatar | VARCHAR(500) | 头像 |
| level | VARCHAR(50) | 会员等级名称 |
| level_code | VARCHAR(50) | 等级编码 |
| status | SMALLINT DEFAULT 0 | 0禁用 1启用 |
| start_time | TIMESTAMP | 订阅开始时间 |
| expire_time | TIMESTAMP | 订阅到期时间 |
| balance | DECIMAL(10,2) DEFAULT 0 | 余额 |
| points | INTEGER DEFAULT 0 | 积分 |
| remark | VARCHAR(500) | 备注 |
| create_time | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| update_time | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | 更新时间 |

---

## 实施变更清单

所有 Java 文件包前缀 `com.mars.boot4.mallarticlesummary`，路径前缀 `mall-ArticleSummary/src/main/java/com/mars/boot4/mallarticlesummary/`。

### A. 构建与配置

**1. [pom.xml](file:///d:/1/sb/1/mall-swarm/mall-ArticleSummary/pom.xml)** — 补全依赖
- 新增依赖（均由根 pom 托管版本）：`mall-common`、`mybatis-spring-boot-starter`、`pagehelper-spring-boot-starter`、`druid-spring-boot-3-starter`、`org.postgresql:postgresql`（无版本号）、`spring-cloud-starter-alibaba-nacos-discovery`、`spring-cloud-starter-alibaba-nacos-config`、`sa-token-spring-boot3-starter`、`sa-token-redis-jackson`、`sa-token-jwt`、`spring-boot-admin-starter-client`、`commons-pool2`。
- 移除冗余的 `spring-boot-starter`（保留 web；web 已被 mall-common 传递引入，保留显式声明无害）。

**2. [application.yml](file:///d:/1/sb/1/mall-swarm/mall-ArticleSummary/src/main/resources/application.yaml)** — 主配置（重命名/覆盖为 application.yml）
- `server.port: 8090`、`spring.application.name: mall-ArticleSummary`、`spring.profiles.active: dev`、`spring.mvc.pathmatch.matching-strategy: ant_path_matcher`。
- `spring.datasource`：PostgreSQL（`jdbc:postgresql://192.168.100.137:5432/mall`，user/pass `mall`/`mall`，driver `org.postgresql.Driver`）+ Druid 连接池参数。
- `mybatis.mapper-locations: classpath:dao/*.xml`。
- `springdoc` 配置 + `springdoc.group-configs.packages-to-scan: com.mars.boot4.mallarticlesummary.controller`。
- `sa-token` 配置（与 mall-admin 一致：Authorization/JWT/uuid/Bearer 前缀）。
- `management` actuator 暴露。

**3. 新建 `application-dev.yml`** — Nacos 注册与配置
- `spring.cloud.nacos.discovery.server-addr: 192.168.100.137:8848`、`config.server-addr`、`file-extension: yaml`、`spring.config.import: nacos:mall-articlesummary-dev.yaml?refreshEnabled=true`。

**4. [MallArticleSummaryApplication.java](file:///d:/1/sb/1/mall-swarm/mall-ArticleSummary/src/main/java/com/mars/boot4/mallarticlesummary/MallArticleSummaryApplication.java)** — 保留 `@EnableDiscoveryClient`，新增 `@EnableFeignClients`（按需，参考 mall-admin，可省略；本模块无 Feign 调用则不加）。

### B. 配置类（config 包）

**5. `config/MyBatisConfig.java`** — `@Configuration` + `@EnableTransactionManagement` + `@MapperScan("com.mars.boot4.mallarticlesummary.dao")`。
**6. `config/SaTokenConfigure.java`** — 注册 `StpLogicJwtForSimple` Bean（同 mall-admin）。
**7. `config/SpringDocConfig.java`** — OpenAPI 信息 + Bearer JWT SecurityScheme + `GlobalOpenApiCustomizer` 全局加鉴权头（同 mall-admin，标题改为「文章管理系统」）。

### C. model 实体（4 个，Lombok `@Data`）

**8-11.** `model/Article.java`、`model/Paper.java`、`model/News.java`、`model/Member.java` — 字段与上表一一对应，使用包装类型（Long/Integer/BigDecimal/Timestamp），`@Schema` 注解描述。

### D. DTO（请求参数，4 个，Lombok `@Data` + 校验）

**12-15.** `dto/ArticleParam.java`、`dto/PaperParam.java`、`dto/NewsParam.java`、`dto/MemberParam.java` — 与实体字段对应（不含 id/createTime/updateTime/viewCount 等），含 `@NotEmpty`/`@Schema` 校验注解（参考 [PmsBrandParam.java](file:///d:/1/sb/1/mall-swarm/mall-admin/src/main/java/com/macro/mall/dto/PmsBrandParam.java)）。

### E. Dao 接口 + XML（4 对）

每对提供：`insert`、`updateByPrimaryKeySelective`、`deleteByPrimaryKey`、`deleteByIds(List)`、`selectByPrimaryKey`、`selectListByPage(keyword, status)`（含分页由 PageHelper 控制）、`updateStatusByIds(ids, status)`。

**16-19. Dao 接口**：`dao/ArticleDao.java`、`dao/PaperDao.java`、`dao/NewsDao.java`、`dao/MemberDao.java`。
**20-23. Mapper XML**（`src/main/resources/dao/`）：`ArticleDao.xml`、`PaperDao.xml`、`NewsDao.xml`、`MemberDao.xml`。
- SQL 全 PostgreSQL 兼容：列名不加重音号；`<insert>` 用 `useGeneratedKeys="true" keyProperty="id"`；批量删除用 `id IN <foreach>`；按状态批量更新用 `UPDATE ... SET status=#{status} WHERE id IN (...)`；`selectListByPage` 用 `<if>` 动态 keyword 模糊匹配 `LIKE CONCAT('%', #{keyword}, '%')`（PG 支持 `||` 与 `CONCAT`，用 `CONCAT` 更稳）；排序 `ORDER BY sort DESC, id DESC`。

### F. Service 接口 + 实现（4 对）

**24-27. Service 接口**：`service/ArticleService.java` 等，方法：`create/update/delete/deleteBatch/list(pageNum,pageSize,keyword,status)/getItem/updateStatus`。
**28-31. Service 实现**：`service/impl/ArticleServiceImpl.java` 等。
- `list` 内 `PageHelper.startPage(pageNum, pageSize)` 后调用 `dao.selectListByPage(...)`；`create/update` 用 `BeanUtils.copyProperties(param, entity)` 后插入/更新；返回 `CommonPage.restPage(list)` 由 controller 包装。

### G. Controller（4 个）

**32-35.** `controller/ArticleController.java`（`@RequestMapping("/article")`）、`PaperController.java`（`/paper`）、`NewsController.java`（`/news`）、`MemberController.java`（`/member`）。
- 注解：`@RestController` + `@Tag` + `@Operation`，参考 [PmsBrandController.java](file:///d:/1/sb/1/mall-swarm/mall-admin/src/main/java/com/macro/mall/controller/PmsBrandController.java)。
- 端点：`POST /create`、`POST /update/{id}`、`GET /delete/{id}`、`POST /delete/batch`、`GET /list`、`GET /{id}`、`POST /update/status`（批量改状态）。返回 `CommonResult`/`CommonResult<CommonPage<T>>`。

### H. 网关路由

**36. [mall-gateway/application.yml](file:///d:/1/sb/1/mall-swarm/mall-gateway/src/main/resources/application.yml)** — 在 routes 下新增：
```yaml
- id: mall-ArticleSummary
  uri: lb://mall-ArticleSummary
  predicates: [Path=/mall-ArticleSummary/**]
  filters: [StripPrefix=1]
```
白名单 `secure.ignore.urls` 已有 `/*/v3/api-docs`、`/*/swagger-ui/**` 通配，无需额外加。后台接口默认鉴权，无需加入白名单。

### I. SQL 脚本

**37. `document/sql/article_summary.sql`** — 4 张表的 `CREATE TABLE IF NOT EXISTS`（含注释 `COMMENT ON COLUMN`）+ 推荐索引（status、publish_time、category）。

---

## 假设与决策

1. PostgreSQL 实例 `192.168.100.137:5432`，库 `mall`，账号 `mall`/`mall`（与既有 MySQL 凭据保持一致，便于复用）。
2. 不引入 `mall-mbg`，避免 MySQL 驱动污染；手写 Dao + XML，SQL 全 PG 兼容。
3. 会员等级以字段 `level`/`level_code` 内嵌于 `art_member`，不单独建表（避免过度设计）。
4. 模块端口 8090；包名保留 `com.mars.boot4.mallarticlesummary`。
5. 全部接口经网关 `mall-ArticleSummary/**` 访问，由网关 Sa-Token 全局过滤器统一鉴权；模块内仅注册 `StpLogicJwtForSimple`，不重复实现过滤逻辑。
6. 本模块不含消息队列（无 Kafka 依赖）。

---

## 验证步骤

1. **编译**：在仓库根执行 `mvn -pl mall-ArticleSummary -am clean compile` 确认无编译错误。
2. **建表**：在 PostgreSQL `mall` 库执行 `document/sql/article_summary.sql`。
3. **启动**：运行 `MallArticleSummaryApplication`，日志确认：端口 8090、连接 PG 成功、注册 Nacos 成功（`mall-ArticleSummary` 出现在服务列表）。
4. **文档**：访问 `http://localhost:8090/swagger-ui/index.html`（或经网关 `http://localhost:8201/mall-ArticleSummary/swagger-ui/index.html`）确认 4 个 Controller 分组与接口可见。
5. **接口联调**（经网关，需带管理员 Sa-Token）：
   - `POST /mall-ArticleSummary/article/create` 建一条文章 → `GET /mall-ArticleSummary/article/list` 返回分页 → `GET /mall-ArticleSummary/article/{id}` 详情 → `POST /mall-ArticleSummary/article/update/{id}` → `GET /mall-ArticleSummary/article/delete/{id}` 删除。
   - 对 paper/news/member 重复上述 create/list/getItem/update/delete 流程。
   - 验证批量删除 `/delete/batch` 与批量改状态 `/update/status`。
6. **回归**：确认未改动 mall-admin/portal 等既有模块逻辑（仅网关 yml 增加一条路由）。
