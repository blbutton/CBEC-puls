package com.macro.mall.gateway.config;

import com.macro.mall.common.config.BaseRedisConfig;
import org.springframework.context.annotation.Configuration;

/**
 * Redis 序列化与基础 Bean 配置
 * <p>继承 mall-common 提供的 {@link BaseRedisConfig}，提供 RedisTemplate / RedisService 等 Bean。</p>
 *
 * @author mall-gateway team
 */
@Configuration
public class RedisConfig extends BaseRedisConfig {

}
