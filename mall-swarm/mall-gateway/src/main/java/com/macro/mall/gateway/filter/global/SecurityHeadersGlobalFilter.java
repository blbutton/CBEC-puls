package com.macro.mall.gateway.filter.global;

import com.macro.mall.gateway.config.SecurityHeadersProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * 安全响应头注入过滤器
 *
 * @author mall-gateway team
 */
@Component
@RequiredArgsConstructor
public class SecurityHeadersGlobalFilter implements GlobalFilter, Ordered {

    private final SecurityHeadersProperties properties;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (!properties.isEnabled()) {
            return chain.filter(exchange);
        }
        ServerHttpResponse response = exchange.getResponse();
        // beforeCommit 回调在响应头提交前同步执行，避免 ReadOnlyHttpHeaders 异常
        response.beforeCommit(() -> {
            injectHeaders(response);
            return Mono.empty();
        });
        return chain.filter(exchange);
    }

    private void injectHeaders(ServerHttpResponse response) {
        HttpHeaders headers = response.getHeaders();
        if (properties.isContentTypeOptions()) {
            setOrSkip(headers, "X-Content-Type-Options", "nosniff");
        }
        if (properties.isXssProtection()) {
            setOrSkip(headers, "X-XSS-Protection", "1; mode=block");
        }
        if (properties.isFrameOptions()) {
            setOrSkip(headers, "X-Frame-Options", "SAMEORIGIN");
        }
        if (properties.isHsts()) {
            setOrSkip(headers, "Strict-Transport-Security", properties.getHstsDirective());
        }
        if (properties.isContentSecurityPolicy()) {
            setOrSkip(headers, "Content-Security-Policy", properties.getCspDirective());
        }
        if (properties.isReferrerPolicy()) {
            setOrSkip(headers, "Referrer-Policy", "strict-origin-when-cross-origin");
        }
        // 额外：X-Permitted-Cross-Domain-Policies
        setOrSkip(headers, "X-Permitted-Cross-Domain-Policies", "none");
    }

    /** 仅当 header 不存在时写入（兼容老 API，不使用 setIfAbsent） */
    private static void setOrSkip(HttpHeaders headers, String name, String value) {
        if (!headers.containsKey(name)) {
            headers.set(name, value);
        }
    }

    @Override
    public int getOrder() {
        return -500;
    }
}
