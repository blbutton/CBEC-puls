package com.macro.mall.gateway.filter.factory;

import cn.hutool.core.util.StrUtil;
import com.macro.mall.gateway.auth.StpMemberLoginType;
import com.macro.mall.gateway.config.GatewayRateLimitProperties;
import com.macro.mall.gateway.util.IpUtil;
import io.github.resilience4j.ratelimiter.RequestNotPermitted;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * 限流网关过滤器工厂
 *
 * @author mall-gateway team
 */
@Slf4j
@Component
public class RateLimitGatewayFilterFactory
        extends AbstractGatewayFilterFactory<RateLimitGatewayFilterFactory.Config> {

    private final RedisRateLimiter redisRateLimiter;
    private final Map<String, KeyResolver> keyResolverMap;
    private final GatewayRateLimitProperties properties;

    public RateLimitGatewayFilterFactory(RedisRateLimiter redisRateLimiter,
                                         Map<String, KeyResolver> keyResolverMap,
                                         GatewayRateLimitProperties properties) {
        super(Config.class);
        this.redisRateLimiter = redisRateLimiter;
        this.keyResolverMap = keyResolverMap;
        this.properties = properties;
    }

    public static class Config {
        private int rate = -1;
        private int burst = -1;
        private String keyResolver;

        public int getRate() { return rate; }
        public void setRate(int rate) { this.rate = rate; }
        public int getBurst() { return burst; }
        public void setBurst(int burst) { this.burst = burst; }
        public String getKeyResolver() { return keyResolver; }
        public void setKeyResolver(String keyResolver) { this.keyResolver = keyResolver; }
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            if (!properties.isEnabled()) {
                return chain.filter(exchange);
            }
            int rate = config.rate > 0 ? config.rate : resolveDefaultRate(exchange, true);
            int burst = config.burst > 0 ? config.burst : resolveDefaultRate(exchange, false);
            String resolverName = StrUtil.isNotBlank(config.keyResolver)
                    ? config.keyResolver
                    : properties.getDefaultKeyResolver();

            KeyResolver keyResolver = keyResolverMap.getOrDefault(resolverName,
                    keyResolverMap.get(properties.getDefaultKeyResolver()));

            // 设置本次限流的默认速率：如果 rate/burst 与默认不一致，临时通过 yml 配置不动态改 RedisRateLimiter 本身，
            // 而是降级为"保守判断"：即直接使用默认 RedisRateLimiter（其默认参数在 RateLimitConfig 中配置）。
            // 这样避免了在多线程环境中修改共享 RedisRateLimiter 带来的竞态，实际生产建议通过 yml 给每个路由单独挂 RequestRateLimiter。

            exchange.getResponse().getHeaders().set("X-RateLimit-Limit", String.valueOf(burst));

            return keyResolver.resolve(exchange)
                    .defaultIfEmpty("__GLOBAL__")
                    .flatMap(key -> redisRateLimiter.isAllowed(
                            exchange.getRequest().getPath().toString(), key))
                    .flatMap(response -> {
                        if (response.isAllowed()) {
                            return chain.filter(exchange);
                        }
                        return writeTooManyRequests(exchange, rate, burst);
                    })
                    .onErrorResume(ex -> {
                        if (ex instanceof RequestNotPermitted) {
                            return writeTooManyRequests(exchange, rate, burst);
                        }
                        log.warn("限流过滤器异常，降级放行：{}", ex.getMessage());
                        return chain.filter(exchange);
                    });
        };
    }

    private int resolveDefaultRate(ServerWebExchange exchange, boolean rateOrBurst) {
        Object rawRouteId = exchange.getAttributes()
                .get(ServerWebExchangeUtils.GATEWAY_PREDICATE_MATCHED_PATH_ROUTE_ID_ATTR);
        String routeId = rawRouteId == null ? "" : String.valueOf(rawRouteId);
        int value;
        switch (routeId) {
            case "mall-admin" -> value = rateOrBurst ? properties.getAdminRate() : properties.getAdminBurst();
            case "mall-portal" -> value = rateOrBurst ? properties.getPortalRate() : properties.getPortalBurst();
            case "ArticleSummary" -> value = rateOrBurst ? properties.getArticleSummaryRate() : properties.getArticleSummaryBurst();
            case "mall-auth" -> value = rateOrBurst ? properties.getAuthRate() : properties.getAuthBurst();
            default -> value = rateOrBurst ? 100 : 200;
        }
        return Math.max(1, value);
    }

    private Mono<Void> writeTooManyRequests(ServerWebExchange exchange, int rate, int burst) {
        exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String body = String.format(
                "{\"code\":6001,\"message\":\"请求过于频繁，请稍后再试（rate=%d/s, burst=%d）\",\"data\":null}",
                rate, burst);
        DataBuffer buf = exchange.getResponse().bufferFactory()
                .wrap(body.getBytes(StandardCharsets.UTF_8));
        return exchange.getResponse().writeWith(Mono.just(buf));
    }

    @Configuration
    public static class KeyResolversConfig {

        @Bean("ip")
        public KeyResolver ipKeyResolver() {
            return exchange -> Mono.justOrEmpty(IpUtil.resolveRealIp(exchange.getRequest()));
        }

        @Bean("path")
        public KeyResolver pathKeyResolver() {
            return exchange -> {
                ServerHttpRequest req = exchange.getRequest();
                String method = req.getMethod() == null ? "?" : req.getMethod().name();
                return Mono.just(method + ":" + req.getURI().getPath());
            };
        }

        @Bean("user")
        public KeyResolver userKeyResolver() {
            return exchange -> {
                Object id = null;
                try {
                    id = cn.dev33.satoken.stp.StpUtil.getLoginIdDefaultNull();
                    if (id == null) {
                        id = StpMemberLoginType.getLoginIdDefaultNull();
                    }
                } catch (Exception ignored) {
                }
                return Mono.just(id == null
                        ? "anon:" + IpUtil.resolveRealIp(exchange.getRequest())
                        : "uid:" + id);
            };
        }

        @Bean("ip_path")
        public KeyResolver ipPathKeyResolver() {
            return exchange -> Mono.just(
                    IpUtil.resolveRealIp(exchange.getRequest())
                            + "|" + exchange.getRequest().getURI().getPath());
        }

        @Bean
        public Map<String, KeyResolver> keyResolverRegistry(KeyResolver ip, KeyResolver path,
                                                            KeyResolver user, KeyResolver ip_path) {
            Map<String, KeyResolver> map = new HashMap<>();
            map.put("ip", ip);
            map.put("path", path);
            map.put("user", user);
            map.put("ip_path", ip_path);
            return map;
        }
    }
}
