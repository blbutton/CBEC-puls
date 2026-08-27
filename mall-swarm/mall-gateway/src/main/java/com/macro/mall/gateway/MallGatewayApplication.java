package com.macro.mall.gateway;

import com.macro.mall.gateway.config.GatewayRateLimitProperties;
import com.macro.mall.gateway.config.IpFilterProperties;
import com.macro.mall.gateway.config.RequestSizeProperties;
import com.macro.mall.gateway.config.SecurityHeadersProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/**
 * 网关服务启动类
 * <p>负责统一入口流量转发、鉴权、限流熔断、访问日志等横切关注点。</p>
 *
 * @author mall-gateway team
 * @since 1.0.0
 */
@EnableDiscoveryClient
@SpringBootApplication(scanBasePackages = {"com.macro.mall.gateway", "com.macro.mall.common"})
@EnableConfigurationProperties({
        IpFilterProperties.class,
        SecurityHeadersProperties.class,
        RequestSizeProperties.class,
        GatewayRateLimitProperties.class
})
public class MallGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(MallGatewayApplication.class, args);
    }

}
