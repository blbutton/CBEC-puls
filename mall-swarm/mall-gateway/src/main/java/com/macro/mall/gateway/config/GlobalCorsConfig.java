package com.macro.mall.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import org.springframework.web.util.pattern.PathPatternParser;

import java.util.Arrays;
import java.util.Collections;

/**
 * 全局跨域配置（WebFlux / Gateway）
 * <p>
 *     相对原版优化：
 *     <ul>
 *         <li>使用 AllowedOriginPatterns（Spring 5.3+ 推荐写法，AllowCredentials 更安全）</li>
 *         <li>显式限制 MaxAge 为 3600s，减少浏览器预检请求频率</li>
 *         <li>显式控制 Methods，而非简单 *</li>
 *         <li>ExposedHeaders 暴露 X-Trace-Id，前端可显示链路 ID</li>
 *     </ul>
 * </p>
 *
 * @author macrozheng (original) / mall-gateway team
 */
@Configuration
public class GlobalCorsConfig {

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration config = new CorsConfiguration();
        // 允许的源（生产环境建议收敛到实际域名）
        config.setAllowedOriginPatterns(Collections.singletonList("*"));
        config.setAllowCredentials(true);
        config.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"));
        config.setAllowedHeaders(Collections.singletonList("*"));
        config.setMaxAge(3600L);
        // 允许前端读取 X-Trace-Id
        config.setExposedHeaders(Arrays.asList(
                "X-Trace-Id",
                "X-RateLimit-Limit",
                "X-RateLimit-Remaining",
                "Content-Disposition"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource(new PathPatternParser());
        source.registerCorsConfiguration("/**", config);
        return new CorsWebFilter(source);
    }
}
