package com.macro.mall.gateway.filter.global;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.macro.mall.common.constant.AuthConstant;
import com.macro.mall.common.dto.UserDto;
import com.macro.mall.gateway.auth.StpMemberLoginType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * 用户头透传过滤器
 * <ul>
 *   <li>Order = -50：在鉴权过滤器之后执行，能够拿到登录态</li>
 *   <li>管理员请求：将 mall-user-id / mall-user-name 写入下游请求头</li>
 *   <li>前台会员请求：将 mall-member-id 写入下游请求头</li>
 *   <li>不重复添加（如果上游请求头已带同名头，先移除再写入，避免伪造）</li>
 * </ul>
 * <p>
 * <b>兼容说明</b>：mall-common 未定义 USER_ID_HEADER / MEMBER_ID_HEADER 等常量，
 * 此处定义为内部私有字符串常量（如需下游读取，保持一致即可）。
 * </p>
 *
 * @author mall-gateway team
 */
@Slf4j
@Component
public class UserHeaderGlobalFilter implements GlobalFilter, Ordered {

    // ------- 私有常量（避免伪造 mall-common 中不存在的字段）-------
    private static final String HDR_USER_ID = "mall-user-id";
    private static final String HDR_USER_NAME = "mall-user-name";
    private static final String HDR_MEMBER_ID = "mall-member-id";
    // 安全：清除已有的 Authorization 头，避免外部伪造（网关只转发 Sa-Token 校验过的身份）
    private static final String HDR_AUTH = AuthConstant.JWT_TOKEN_HEADER;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest original = exchange.getRequest();
        String path = original.getURI().getPath();
        ServerHttpRequest.Builder builder = original.mutate();

        if (path != null && path.startsWith("/mall-admin")) {
            writeAdminHeaders(builder);
        } else if (path != null
                && (path.startsWith("/mall-portal") || path.startsWith("/ArticleSummary"))) {
            writeMemberHeaders(builder);
        }
        // 清理可能伪造的 Authorization（下游只信路由内网）
        builder.headers(hd -> hd.remove(HDR_AUTH));

        return chain.filter(exchange.mutate().request(builder.build()).build());
    }

    private void writeAdminHeaders(ServerHttpRequest.Builder builder) {
        try {
            Object loginIdObj = StpUtil.getLoginIdDefaultNull();
            Object sessionObj = StpUtil.getSession().get(AuthConstant.STP_ADMIN_INFO);
            String loginId = loginIdObj == null ? null : String.valueOf(loginIdObj);

            builder.headers(hd -> {
                hd.remove(HDR_USER_ID);
                hd.remove(HDR_USER_NAME);
            });

            if (StrUtil.isNotBlank(loginId)) {
                builder.header(HDR_USER_ID, loginId);
            }
            if (sessionObj instanceof UserDto adminInfo) {
                if (StrUtil.isNotBlank(adminInfo.getUsername())) {
                    builder.header(HDR_USER_NAME, adminInfo.getUsername());
                }
            }
        } catch (Exception ex) {
            if (log.isDebugEnabled()) {
                log.debug("管理员请求头透传异常（通常为未登录态）：{}", ex.getMessage());
            }
        }
    }

    private void writeMemberHeaders(ServerHttpRequest.Builder builder) {
        try {
            Object memberId = StpMemberLoginType.getLoginIdDefaultNull();
            builder.headers(hd -> hd.remove(HDR_MEMBER_ID));
            if (memberId != null) {
                builder.header(HDR_MEMBER_ID, String.valueOf(memberId));
            }
        } catch (Exception ex) {
            if (log.isDebugEnabled()) {
                log.debug("会员请求头透传异常（通常为未登录态）：{}", ex.getMessage());
            }
        }
    }

    @Override
    public int getOrder() {
        return -50;
    }
}
