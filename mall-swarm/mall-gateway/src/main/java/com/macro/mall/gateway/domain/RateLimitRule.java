package com.macro.mall.gateway.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;

/**
 * 限流规则
 * <p>描述基于令牌桶算法的限流参数。</p>
 *
 * @author mall-gateway team
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RateLimitRule implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 限流 Key（ip / path / user / ip_path） */
    private String key;

    /** 每秒令牌生成速率 */
    private int replenishRate;

    /** 令牌桶突发容量 */
    private int burstCapacity;

    /** 每次请求消耗令牌数（默认为 1） */
    @Builder.Default
    private int requestedTokens = 1;
}
