package com.macro.mall.gateway.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * 限流相关 Bean 配置
 * <p>
 * <b>兼容说明</b>：Spring Cloud Gateway 4.x 中 {@code GatewayAutoConfiguration} 的
 * {@code requestRateLimiterGatewayFilterFactory} 方法需要注入单个 {@link KeyResolver} Bean。
 * 当容器中存在多个 KeyResolver 时（ip/path/user/ip_path），必须标记其中一个为 @Primary，
 * 否则 Spring 无法决定默认注入哪个。
 * </p>
 *
 * @author mall-gateway team
 */
@Configuration
public class RateLimitConfig {

    @Bean
    public RedisRateLimiter defaultRedisRateLimiter(GatewayRateLimitProperties properties) {
        int rate = Math.max(1, properties.getAdminRate());
        int burst = Math.max(1, properties.getAdminBurst());
        return new RedisRateLimiter(rate, burst);
    }

    /**
     * 默认 KeyResolver —— 标记 @Primary，解决 GatewayAutoConfiguration 注入歧义
     */
    @Bean("defaultKeyResolver")
    @Primary
    public KeyResolver defaultKeyResolver(@Qualifier("ip_path") KeyResolver ipPathResolver) {
        return ipPathResolver;
    }
}
