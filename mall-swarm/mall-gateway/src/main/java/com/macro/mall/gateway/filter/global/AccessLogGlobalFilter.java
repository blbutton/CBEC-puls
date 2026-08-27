package com.macro.mall.gateway.filter.global;

import com.macro.mall.gateway.auth.StpMemberLoginType;
import com.macro.mall.gateway.domain.AccessLog;
import com.macro.mall.gateway.util.IpUtil;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;

/**
 * 访问日志全局过滤器
 *
 * @author mall-gateway team
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AccessLogGlobalFilter implements GlobalFilter, Ordered {

    private static final String LOG_NAME = "GATEWAY_ACCESS_LOG";

    private final MeterRegistry meterRegistry;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        Instant start = Instant.now();
        ServerHttpRequest req = exchange.getRequest();
        long reqSize = req.getHeaders().getContentLength() > 0
                ? req.getHeaders().getContentLength()
                : 0L;

        return chain.filter(exchange)
                .then(Mono.<Void>fromRunnable(() -> writeLog(exchange, start, reqSize, null)))
                .onErrorResume(ex -> {
                    writeLog(exchange, start, reqSize, ex);
                    return Mono.error(ex);
                });
    }

    private void writeLog(ServerWebExchange exchange, Instant start, long reqSize, Throwable ex) {
        try {
            ServerHttpRequest req = exchange.getRequest();
            String traceId = req.getHeaders().getFirst(TraceIdGlobalFilter.HEADER_TRACE_ID);
            int statusCode;
            if (exchange.getResponse().getStatusCode() == null) {
                statusCode = (ex == null) ? 200 : 500;
            } else {
                statusCode = exchange.getResponse().getStatusCode().value();
            }

            Route route = exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR);
            String serviceId = route != null ? route.getId() : "N/A";
            long respSize = exchange.getResponse().getHeaders().getContentLength() > 0
                    ? exchange.getResponse().getHeaders().getContentLength()
                    : 0L;
            long durationMs = Duration.between(start, Instant.now()).toMillis();

            String userId = resolveUserId(req.getURI().getPath());

            AccessLog logObj = AccessLog.builder()
                    .timestamp(start)
                    .traceId(traceId)
                    .method(req.getMethod() == null ? "?" : req.getMethod().name())
                    .path(req.getURI().getPath())
                    .sourceIp(IpUtil.resolveRealIp(req))
                    .serviceId(serviceId)
                    .status(statusCode)
                    .durationMs(durationMs)
                    .requestSize(reqSize)
                    .responseSize(respSize)
                    .userId(userId)
                    .build();

            log.info("[{}] {}", LOG_NAME, logObj.toJsonLog());
            recordMetrics(serviceId, statusCode, durationMs);
        } catch (Exception writeEx) {
            log.warn("写入访问日志失败: {}", writeEx.getMessage());
        }
    }

    private String resolveUserId(String path) {
        if (path == null) {
            return null;
        }
        try {
            if (path.startsWith("/mall-admin")) {
                Object id = cn.dev33.satoken.stp.StpUtil.getLoginIdDefaultNull();
                return id == null ? null : String.valueOf(id);
            }
            if (path.startsWith("/mall-portal") || path.startsWith("/ArticleSummary")) {
                Object id = StpMemberLoginType.getLoginIdDefaultNull();
                return id == null ? null : String.valueOf(id);
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private void recordMetrics(String serviceId, int status, long durationMs) {
        try {
            String statusBucket = status < 400 ? "2xx-3xx" : (status < 500 ? "4xx" : "5xx");
            meterRegistry.counter("gateway_requests_total",
                    "service", serviceId,
                    "status", statusBucket).increment();
            Timer.builder("gateway_requests_duration")
                    .tag("service", serviceId)
                    .tag("status", statusBucket)
                    .register(meterRegistry)
                    .record(Duration.ofMillis(durationMs));
        } catch (Exception ex) {
            log.debug("上报 Micrometer 指标失败: {}", ex.getMessage());
        }
    }

    @Override
    public int getOrder() {
        return 0;
    }
}
