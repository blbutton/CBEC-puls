package com.macro.mall.gateway.auth;

import cn.dev33.satoken.context.SaHolder;
import cn.dev33.satoken.exception.NotLoginException;
import cn.dev33.satoken.exception.NotPermissionException;
import cn.dev33.satoken.reactor.filter.SaReactorFilter;
import cn.dev33.satoken.router.SaHttpMethod;
import cn.dev33.satoken.router.SaRouter;
import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.convert.Convert;
import cn.hutool.core.util.StrUtil;
import com.macro.mall.common.api.CommonResult;
import com.macro.mall.gateway.config.IgnoreUrlsConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Sa-Token 鉴权网关配置
 * <p>
 * 相对原 {@code SaTokenConfig} 改进：
 * <ol>
 *     <li>将权限映射解析逻辑抽离到 {@link PermissionChecker}，职责单一、易单元测试</li>
 *     <li>删除对巨型类 {@code StpMemberUtil} 的依赖，使用精简 Wrapper {@link StpMemberLoginType}</li>
 *     <li>鉴权错误响应统一处理，不抛出未捕获的字符串异常</li>
 *     <li>对 ArticleSummary 模块支持前台会员登录鉴权</li>
 * </ol>
 * </p>
 *
 * @author mall-gateway team
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class SaTokenAuthConfig {

    private final IgnoreUrlsConfig ignoreUrlsConfig;
    private final PermissionChecker permissionChecker;

    /**
     * 注册 Sa-Token 响应式全局过滤器（WebFlux 环境）
     *
     * @return SaReactorFilter Bean
     */
    @Bean
    public SaReactorFilter saReactorFilter() {
        return new SaReactorFilter()
                .addInclude("/**")
                .setExcludeList(ignoreUrlsConfig.getUrls())
                .setAuth(obj -> {
                    // 0. 白名单放行（setExcludeList 可能不生效，在此二次检查）
                    for (String pattern : ignoreUrlsConfig.getUrls()) {
                        SaRouter.match(pattern).stop();
                    }

                    // 1. 预检请求放行
                    SaRouter.match(SaHttpMethod.OPTIONS).stop();

                    // 2. 前台业务：会员登录校验
                    SaRouter.match("/mall-portal/**", r -> StpMemberLoginType.checkLogin()).stop();
                    SaRouter.match("/ArticleSummary/**", r -> StpMemberLoginType.checkLogin()).stop();

                    // 3. 后台业务：管理员登录校验
                    SaRouter.match("/mall-admin/**", r -> StpUtil.checkLogin());

                    // 4. 后台权限校验（基于 Redis 路径-资源映射）
                    String requestPath = SaHolder.getRequest().getRequestPath();
                    List<String> needPerms = permissionChecker.resolveRequiredPermissions(requestPath);
                    if (StrUtil.isNotBlank(requestPath) && !needPerms.isEmpty()) {
                        SaRouter.match(requestPath,
                                r -> StpUtil.checkPermissionOr(Convert.toStrArray(needPerms)));
                    }
                })
                .setError(this::handleException);
    }

    /**
     * 鉴权阶段异常转 CommonResult，响应头统一设置为 JSON UTF-8
     *
     * @param throwable setAuth 抛出的异常
     * @return 业务化响应体
     */
    @SuppressWarnings("rawtypes")
    private CommonResult handleException(Throwable throwable) {
        SaHolder.getResponse()
                .setHeader("Content-Type", "application/json; charset=utf-8")
                .setHeader("Access-Control-Allow-Origin", "*")
                .setHeader("Cache-Control", "no-cache");

        if (log.isDebugEnabled()) {
            log.debug("Sa-Token 鉴权异常: {} {}", throwable.getClass().getSimpleName(), throwable.getMessage());
        }

        if (throwable instanceof NotLoginException) {
            return CommonResult.unauthorized(null);
        }
        if (throwable instanceof NotPermissionException) {
            return CommonResult.forbidden(null);
        }
        // 兜底：记录错误日志（Redis 故障等异常）
        log.warn("Sa-Token 鉴权兜底错误: {}", throwable.getMessage());
        return CommonResult.failed(throwable.getMessage());
    }
}
