package com.macro.mall.gateway.config;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

import java.util.List;

/**
 * 网关白名单配置
 * <p>绑定前缀：{@code secure.ignore}。</p>
 * <p>列表中的 URL 模式将跳过 Sa-Token 登录与权限校验。</p>
 *
 * @author macrozheng (original) / mall-gateway team
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Component
@Validated
@ConfigurationProperties(prefix = "secure.ignore")
public class IgnoreUrlsConfig {

    /**
     * 白名单 URL 模式列表（AntPathMatcher 语法）
     */
    @NotEmpty(message = "白名单列表不能为空（至少包含 doc.html 与 actuator）")
    private List<String> urls;
}
