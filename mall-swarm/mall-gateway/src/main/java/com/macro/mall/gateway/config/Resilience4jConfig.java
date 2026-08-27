package com.macro.mall.gateway.config;

import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.micrometer.tagged.TaggedCircuitBreakerMetrics;
import io.github.resilience4j.timelimiter.TimeLimiterConfig;
import io.github.resilience4j.timelimiter.TimeLimiterRegistry;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.circuitbreaker.resilience4j.ReactiveResilience4JCircuitBreakerFactory;
import org.springframework.cloud.circuitbreaker.resilience4j.Resilience4JConfigBuilder;
import org.springframework.cloud.client.circuitbreaker.Customizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Resilience4j 熔断 / 超时 / 指标配置
 *
 * @author mall-gateway team
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class Resilience4jConfig {

    private final MeterRegistry meterRegistry;

    @Value("${resilience4j.circuitbreaker.configs.default.failure-rate-threshold:50}")
    private float failureRateThreshold;

    @Value("${resilience4j.timelimiter.configs.default.timeout-duration:5s}")
    private String timeoutDuration;

    @Bean
    public Customizer<ReactiveResilience4JCircuitBreakerFactory> defaultCustomizer() {
        return factory -> {
            CircuitBreakerRegistry registry = factory.getCircuitBreakerRegistry();
            TaggedCircuitBreakerMetrics.ofCircuitBreakerRegistry(registry).bindTo(meterRegistry);

            // 监听现有所有熔断器的状态迁移
            registry.getAllCircuitBreakers().forEach(cb ->
                    cb.getEventPublisher().onStateTransition(event ->
                            log.warn("CircuitBreaker 状态转换：cb={} {} -> {}",
                                    event.getCircuitBreakerName(),
                                    event.getStateTransition().getFromState(),
                                    event.getStateTransition().getToState())));

            Duration timeout = parseDuration(timeoutDuration);

            CircuitBreakerConfig cbConfig = CircuitBreakerConfig.custom()
                    .failureRateThreshold(failureRateThreshold)
                    .slidingWindowSize(100)
                    .minimumNumberOfCalls(20)
                    .waitDurationInOpenState(Duration.ofSeconds(30))
                    .permittedNumberOfCallsInHalfOpenState(10)
                    .build();
            TimeLimiterConfig tlConfig = TimeLimiterConfig.custom()
                    .timeoutDuration(timeout)
                    .cancelRunningFuture(true)
                    .build();

            // 1) 直接向工厂持有的 TimeLimiterRegistry 预注册 defaultCircuitBreaker，消除 WARN
            TimeLimiterRegistry tlRegistry = factory.getTimeLimiterRegistry();
            tlRegistry.timeLimiter("defaultCircuitBreaker", tlConfig);

            // 2) 兜底默认配置（其他未显式注册的熔断器 id）
            factory.configureDefault(id -> new Resilience4JConfigBuilder(id)
                    .circuitBreakerConfig(cbConfig)
                    .timeLimiterConfig(tlConfig)
                    .build());
        };
    }

    @Bean
    public TimeLimiterRegistry timeLimiterRegistry() {
        TimeLimiterRegistry registry = TimeLimiterRegistry.ofDefaults();
        // 预注册 defaultCircuitBreaker，避免工厂查找时回退到 5s 默认值
        Duration timeout = parseDuration(timeoutDuration);
        registry.timeLimiter("defaultCircuitBreaker", TimeLimiterConfig.custom()
                .timeoutDuration(timeout)
                .cancelRunningFuture(true)
                .build());
        return registry;
    }

    /**
     * 解析时长字符串（支持 5s / 1000ms 格式）
     */
    private Duration parseDuration(String raw) {
        try {
            String s = raw.trim().toLowerCase();
            if (s.endsWith("ms")) {
                return Duration.ofMillis(Long.parseLong(s.substring(0, s.length() - 2)));
            } else if (s.endsWith("s")) {
                return Duration.ofSeconds(Long.parseLong(s.substring(0, s.length() - 1)));
            } else if (s.endsWith("m")) {
                return Duration.ofMinutes(Long.parseLong(s.substring(0, s.length() - 1)));
            }
            return Duration.ofSeconds(5);
        } catch (Exception ex) {
            return Duration.ofSeconds(5);
        }
    }
}
