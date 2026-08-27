package com.macro.mall.gateway.controller;

import cn.dev33.satoken.exception.NotLoginException;
import cn.dev33.satoken.exception.NotPermissionException;
import com.macro.mall.common.api.CommonResult;
import com.macro.mall.common.api.IErrorCode;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.ratelimiter.RequestNotPermitted;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.util.concurrent.TimeoutException;

/**
 * 统一降级/兜底控制器
 * <p>
 * <b>兼容说明</b>：mall-common 的 ResultCode 只定义了 SUCCESS/FAILED/VALIDATE_FAILED/UNAUTHORIZED/FORBIDDEN，
 * 未定义 SERVICE_UNAVAILABLE/NOT_FOUND/GATEWAY_TIMEOUT，因此对于业务码 503/504/404 等场景，
 * 通过自定义 code 字段的 {@link CommonResult#restResult(Object, long, String)} 等价方法不存在，
 * 我们使用 {@code new CommonResult<>().setCode(code).setMessage(msg)} 方式构造。
 * </p>
 *
 * @author mall-gateway team
 */
@Slf4j
@RestController
public class FallbackController {

    /**
     * 熔断 / 超时统一兜底入口（CircuitBreaker fallbackUri = forward:/fallback）
     */
    @RequestMapping("/fallback")
    public Mono<ResponseEntity<CommonResult<Object>>> fallback() {
        log.warn("熔断/超时触发：已进入 fallback 处理器");
        return Mono.just(ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(newResult(503, "服务繁忙，请稍后再试")));
    }

    /** Sa-Token 未登录：401 */
    @ExceptionHandler(NotLoginException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public CommonResult<Object> handleNotLogin(NotLoginException ex) {
        return CommonResult.unauthorized(null);
    }

    /** Sa-Token 无权限：403 */
    @ExceptionHandler(NotPermissionException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public CommonResult<Object> handleNotPerm(NotPermissionException ex) {
        return CommonResult.forbidden(null);
    }

    /** 熔断打开期间的拒绝请求：503 */
    @ExceptionHandler(CallNotPermittedException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public CommonResult<Object> handleCircuitOpen(CallNotPermittedException ex) {
        log.warn("熔断器打开：{}", ex.getMessage());
        return newResult(503, "服务临时不可用");
    }

    /** Resilience4j 限流器拒绝请求：429（code=6001 业务化） */
    @ExceptionHandler(RequestNotPermitted.class)
    @ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
    public CommonResult<Object> handleRateLimit(RequestNotPermitted ex) {
        return newResult(6001, "请求过于频繁，请稍后再试");
    }

    /** 调用超时：504 */
    @ExceptionHandler(TimeoutException.class)
    @ResponseStatus(HttpStatus.GATEWAY_TIMEOUT)
    public CommonResult<Object> handleTimeout(TimeoutException ex) {
        log.warn("下游服务调用超时：{}", ex.getMessage());
        return newResult(504, "下游服务调用超时");
    }

    /** ResponseStatus 异常（404 映射为路由不存在） */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<CommonResult<Object>> handleResponseStatus(ResponseStatusException ex) {
        int status = ex.getStatusCode().value();
        if (status == HttpStatus.NOT_FOUND.value()) {
            return ResponseEntity.status(status).body(newResult(404, "请求的路由不存在"));
        }
        String reason = ex.getReason() != null ? ex.getReason() : "请求异常";
        return ResponseEntity.status(status).body(CommonResult.failed(reason));
    }

    /**
     * 构造自定义 code 的 CommonResult：使用 IErrorCode + failed(IErrorCode, msg)，避免反射调 protected 构造器
     */
    private CommonResult<Object> newResult(long code, String message) {
        final long c = code;
        final String m = message;
        IErrorCode ec = new IErrorCode() {
            @Override public long getCode() { return c; }
            @Override public String getMessage() { return m; }
        };
        return CommonResult.failed(ec, message);
    }
}
