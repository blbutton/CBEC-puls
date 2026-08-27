package com.macro.mall.gateway.filter.global;

import cn.hutool.core.util.IdUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * 链路追踪 ID 全局过滤器
 * <ul>
 *     <li>请求入站时生成唯一 traceId（优先沿用上游已带有的 X-Trace-Id）</li>
 *     <li>将 traceId 写入请求头，下游服务可直接透传</li>
 *     <li>作为 Reactor Context 元素，可在后续 Mono/Flux 中读取</li>
 *     <li>Order = -9999，作为最前置的过滤器之一，保证后续所有过滤器都能拿到 traceId</li>
 * </ul>
 *
 * @author mall-gateway team
 */
@Slf4j
@Component
public class TraceIdGlobalFilter implements GlobalFilter, Ordered {

    /** 链路 ID 请求头 Key（请求/响应、下游服务统一使用） */
    public static final String HEADER_TRACE_ID = "X-Trace-Id";

    /** Reactor Context Key */
    public static final String CTX_TRACE_ID = "traceId";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest req = exchange.getRequest();
        String upstreamTraceId = req.getHeaders().getFirst(HEADER_TRACE_ID);
        String traceId = (upstreamTraceId != null && !upstreamTraceId.isBlank())
                ? upstreamTraceId
                : IdUtil.fastSimpleUUID();

        ServerHttpRequest mutated = req.mutate()
                .header(HEADER_TRACE_ID, traceId)
                .build();

        if (log.isTraceEnabled()) {
            log.trace("[traceId={}] method={} uri={}", traceId, req.getMethod(), req.getURI().getRawPath());
        }

        // beforeCommit 回调在响应头提交前同步执行，避免 ReadOnlyHttpHeaders 异常
        exchange.getResponse().beforeCommit(() -> {
            exchange.getResponse().getHeaders().set(HEADER_TRACE_ID, traceId);
            return Mono.empty();
        });

        return chain.filter(exchange.mutate().request(mutated).build())
                .contextWrite(ctx -> ctx.put(CTX_TRACE_ID, traceId));
    }

    @Override
    public int getOrder() {
        return -9999;
    }
}
