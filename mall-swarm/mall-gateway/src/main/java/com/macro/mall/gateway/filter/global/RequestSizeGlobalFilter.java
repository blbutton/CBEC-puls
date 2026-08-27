package com.macro.mall.gateway.filter.global;

import com.macro.mall.common.api.ResultCode;
import com.macro.mall.gateway.config.RequestSizeProperties;
import io.netty.util.CharsetUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * 请求体大小限制过滤器
 * <ul>
 *   <li>基于 Content-Length 头做前置校验（非流式检查，避免额外 Buffer 开销）</li>
 *   <li>对于分块传输且无法预先确定大小的请求，放行至下游服务限制</li>
 *   <li>支持 AntPath 豁免路径（大文件上传）</li>
 *   <li>Order = -200：在鉴权前即可拦截大请求，减少无效资源消耗</li>
 * </ul>
 *
 * @author mall-gateway team
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RequestSizeGlobalFilter implements GlobalFilter, Ordered {

    private final RequestSizeProperties properties;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        // 豁免路径
        if (properties.getExcludePaths() != null
                && properties.getExcludePaths().stream().anyMatch(p -> pathMatcher.match(p, path))) {
            return chain.filter(exchange);
        }

        long contentLength = request.getHeaders().getContentLength();
        // 分块或未声明长度 -> 放行至下游（由下游业务限制）
        if (contentLength < 0) {
            return chain.filter(exchange);
        }

        long limit = properties.getMaxSizeBytes();
        if (contentLength <= limit) {
            return chain.filter(exchange);
        }

        log.warn("请求超出大小限制 path={} size={} limit={}", path, contentLength, limit);

        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.PAYLOAD_TOO_LARGE);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String body = String.format(
                "{\"code\":%d,\"message\":\"请求体过大（最大 %d MB）\",\"data\":null}",
                ResultCode.VALIDATE_FAILED.getCode(), properties.getMaxSizeMb());
        DataBuffer buf = response.bufferFactory().wrap(body.getBytes(CharsetUtil.UTF_8));
        return response.writeWith(Mono.just(buf));
    }

    @Override
    public int getOrder() {
        return -200;
    }
}
