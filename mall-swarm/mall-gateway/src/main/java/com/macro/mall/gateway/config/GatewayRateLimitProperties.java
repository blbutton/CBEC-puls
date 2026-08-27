package com.macro.mall.gateway.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 网关限流配置属性
 * <p>绑定前缀：{@code gateway.rate-limit}</p>
 *
 * @author mall-gateway team
 */
@Data
@ConfigurationProperties(prefix = "gateway.rate-limit")
public class GatewayRateLimitProperties {

    /** 是否启用限流过滤器，默认 true */
    private boolean enabled = true;

    /** mall-admin 路由每秒令牌数，默认 100 */
    private int adminRate = 100;

    /** mall-admin 路由令牌桶突发容量，默认 200 */
    private int adminBurst = 200;

    /** mall-portal 路由每秒令牌数，默认 200 */
    private int portalRate = 200;

    /** mall-portal 路由令牌桶突发容量，默认 400 */
    private int portalBurst = 400;

    /** ArticleSummary 路由每秒令牌数，默认 200 */
    private int articleSummaryRate = 200;

    /** ArticleSummary 路由令牌桶突发容量，默认 400 */
    private int articleSummaryBurst = 400;

    /** mall-auth 路由每秒令牌数，默认 200（登录保护） */
    private int authRate = 200;

    /** mall-auth 路由令牌桶突发容量，默认 400 */
    private int authBurst = 400;

    /**
     * 默认限流键解析策略：
     * <ul>
     *   <li>{@code ip} —— 按源 IP</li>
     *   <li>{@code path} —— 按请求路径</li>
     *   <li>{@code user} —— 按登录用户 ID</li>
     *   <li>{@code ip_path}（默认）—— IP + 路径组合</li>
     * </ul>
     */
    private String defaultKeyResolver = "ip_path";
}
