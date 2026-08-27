package com.macro.mall.gateway.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;
import java.util.Collections;
import java.util.List;

/**
 * IP 过滤规则
 * <p>支持白名单（whitelist）与黑名单（blacklist）两种模式，兼容 CIDR 表示法。</p>
 *
 * @author mall-gateway team
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IpFilterRule implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 过滤模式
     */
    public enum Mode {
        /** 白名单：只有在列表中的 IP 允许通过 */
        WHITELIST,
        /** 黑名单：在列表中的 IP 拒绝访问 */
        BLACKLIST
    }

    /** 过滤模式，默认 BLACKLIST */
    @Builder.Default
    private Mode mode = Mode.BLACKLIST;

    /** IP/CIDR 列表（例如 "192.168.1.0/24"、"10.0.0.1"） */
    @Builder.Default
    private List<String> ips = Collections.emptyList();
}
