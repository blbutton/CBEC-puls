package com.macro.mall.gateway.exception;

import cn.dev33.satoken.exception.NotLoginException;
import cn.dev33.satoken.exception.NotPermissionException;
import cn.hutool.json.JSONUtil;
import com.macro.mall.common.api.CommonResult;
import com.macro.mall.common.api.IErrorCode;
import com.macro.mall.gateway.filter.global.TraceIdGlobalFilter;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.ratelimiter.RequestNotPermitted;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.reactive.error.ErrorWebExceptionHandler;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeoutException;

/**
 * 网关全局异常处理器（WebFlux / Gateway 响应式）
 *
 * @author mall-gateway team
 */
@Slf4j
@Order(-2)
@Component
public class GlobalErrorWebExceptionHandler implements ErrorWebExceptionHandler {

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        if (exchange.getResponse().isCommitted()) {
            return Mono.error(ex);
        }

        ServerHttpResponse response = exchange.getResponse();
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String traceId = exchange.getRequest().getHeaders().getFirst(TraceIdGlobalFilter.HEADER_TRACE_ID);
        if (traceId != null) {
            response.getHeaders().set(TraceIdGlobalFilter.HEADER_TRACE_ID, traceId);
        }

        ErrorResp err = mapToError(ex);
        response.setStatusCode(HttpStatus.valueOf(err.httpStatus));

        CommonResult<Object> body = buildResult(err.code, err.message);
        if (err.shouldLogWarn) {
            log.warn("网关异常 code={} traceId={} msg={} cause={}",
                    err.code, traceId, err.message, ex.getClass().getSimpleName());
        } else {
            log.debug("网关受控异常 code={} traceId={} msg={}", err.code, traceId, err.message);
        }

        byte[] bytes = JSONUtil.toJsonStr(body).getBytes(StandardCharsets.UTF_8);
        DataBuffer buffer = response.bufferFactory().wrap(bytes);
        return response.writeWith(Mono.just(buffer));
    }

    private ErrorResp mapToError(Throwable ex) {
        if (ex instanceof NotLoginException) {
            return new ErrorResp(401, 401, "暂未登录或登录已过期", false);
        }
        if (ex instanceof NotPermissionException) {
            return new ErrorResp(403, 403, "没有访问该资源的权限", false);
        }
        if (ex instanceof GatewayException gex) {
            return new ErrorResp(200, gex.getCode().getCode(), gex.getMessage(), true);
        }
        if (ex instanceof CallNotPermittedException) {
            return new ErrorResp(503, 503, "服务临时不可用（熔断已打开）", true);
        }
        if (ex instanceof RequestNotPermitted) {
            return new ErrorResp(429, 6001, "请求过于频繁，请稍后再试", false);
        }
        if (ex instanceof TimeoutException) {
            return new ErrorResp(504, 504, "下游服务调用超时", true);
        }
        if (ex instanceof ResponseStatusException rse) {
            int status = rse.getStatusCode().value();
            String reason = rse.getReason() != null ? rse.getReason()
                    : HttpStatus.valueOf(status).getReasonPhrase();
            if (status == 404) reason = "请求的路由不存在";
            return new ErrorResp(status, status, reason, true);
        }
        log.error("网关未分类异常", ex);
        return new ErrorResp(500, 500, "服务器内部错误", true);
    }

    private CommonResult<Object> buildResult(long code, String message) {
        final long c = code;
        final String m = message;
        IErrorCode ec = new IErrorCode() {
            @Override public long getCode() { return c; }
            @Override public String getMessage() { return m; }
        };
        return CommonResult.failed(ec, message);
    }

    private static final class ErrorResp {
        final int httpStatus;
        final long code;
        final String message;
        final boolean shouldLogWarn;

        ErrorResp(int httpStatus, long code, String message, boolean shouldLogWarn) {
            this.httpStatus = httpStatus;
            this.code = code;
            this.message = message;
            this.shouldLogWarn = shouldLogWarn;
        }
    }
}
