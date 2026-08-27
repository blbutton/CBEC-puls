package com.macro.mall.gateway.filter.global;

import com.macro.mall.common.api.ResultCode;
import com.macro.mall.gateway.config.IpFilterProperties;
import com.macro.mall.gateway.util.CidrMatcher;
import com.macro.mall.gateway.util.IpUtil;
import io.netty.util.CharsetUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * IP 黑白名单全局过滤器
 * <ul>
 *     <li>Order = -100：在鉴权过滤器之前、TraceId 之后执行</li>
 *     <li>黑名单模式：在列表中的 IP 返回 403 Forbidden</li>
 *     <li>白名单模式：不在列表中的 IP 返回 403 Forbidden</li>
 *     <li>兼容 CIDR（例如 192.168.1.0/24）与单 IP 表示法</li>
 * </ul>
 *
 * @author mall-gateway team
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class IpBlacklistGlobalFilter implements GlobalFilter, Ordered {

    private final IpFilterProperties ipFilterProperties;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String ip = IpUtil.resolveRealIp(request);
        List<String> list = ipFilterProperties.getList();
        boolean matched = CidrMatcher.matchAny(ip, list);

        boolean whitelistMode = ipFilterProperties.isWhitelistMode();
        boolean reject = whitelistMode ? !matched : matched;

        if (!reject) {
            return chain.filter(exchange);
        }

        Route route = exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR);
        String routeId = route != null ? route.getId() : "N/A";
        String mode = whitelistMode ? "WHITELIST(未匹配)" : "BLACKLIST(匹配)";
        log.warn("IP {} 被拒绝访问 route={} 模式={} 规则列表={}", ip, routeId, mode, list);

        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.FORBIDDEN);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = String.format(
                "{\"code\":%d,\"message\":\"IP (%s) 拒绝访问\",\"data\":null}",
                ResultCode.FORBIDDEN.getCode(), ip);
        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(CharsetUtil.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }

    @Override
    public int getOrder() {
        return -100;
    }
}
