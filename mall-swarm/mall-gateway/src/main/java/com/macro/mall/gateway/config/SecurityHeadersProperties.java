package com.macro.mall.gateway.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 安全响应头过滤器配置属性
 * <p>绑定前缀：{@code gateway.security-headers}</p>
 *
 * @author mall-gateway team
 */
@Data
@ConfigurationProperties(prefix = "gateway.security-headers")
public class SecurityHeadersProperties {

    /** 是否启用安全响应头注入，默认 true */
    private boolean enabled = true;

    /** X-Content-Type-Options: nosniff，默认 true */
    private boolean contentTypeOptions = true;

    /** X-XSS-Protection: 1; mode=block，默认 true */
    private boolean xssProtection = true;

    /** X-Frame-Options: SAMEORIGIN，默认 true */
    private boolean frameOptions = true;

    /** Strict-Transport-Security（HTTPS 环境建议开启），默认 true */
    private boolean hsts = true;

    /** Content-Security-Policy，默认 true */
    private boolean contentSecurityPolicy = true;

    /** Referrer-Policy，默认 true */
    private boolean referrerPolicy = true;

    /** CSP 指令，默认 default-src 'self'，可根据业务放宽 */
    private String cspDirective = "default-src 'self'";

    /** HSTS 指令，默认 max-age=31536000; includeSubDomains */
    private String hstsDirective = "max-age=31536000; includeSubDomains";
}
