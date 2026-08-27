package com.macro.mall.gateway.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

/**
 * IP 黑白名单过滤器配置属性
 * <p>绑定前缀：{@code gateway.ip-filter}</p>
 *
 * @author mall-gateway team
 */
@Data
@ConfigurationProperties(prefix = "gateway.ip-filter")
public class IpFilterProperties {

    /**
     * 过滤模式：blacklist（默认）或 whitelist
     */
    private String mode = "blacklist";

    /**
     * IP/CIDR 列表（例如 192.168.1.0/24, 10.0.0.1）
     */
    private List<String> list = new ArrayList<>();

    /**
     * 是否为白名单模式
     *
     * @return true = whitelist，false = blacklist
     */
    public boolean isWhitelistMode() {
        return "whitelist".equalsIgnoreCase(mode);
    }
}
