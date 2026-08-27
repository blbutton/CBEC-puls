package com.mars.boot4.mallarticlesummary.shared.exception;

import com.macro.mall.common.api.CommonResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常处理：统一将异常转换为 CommonResult
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public CommonResult<?> handleBusiness(BusinessException e) {
        log.warn("业务异常: {}", e.getMessage());
        return CommonResult.failed(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public CommonResult<?> handleMethodArgumentNotValid(MethodArgumentNotValidException e) {
        FieldError fe = e.getBindingResult().getFieldError();
        String msg = fe != null ? fe.getDefaultMessage() : ErrorCode.PARAM_INVALID.getMessage();
        return CommonResult.validateFailed(msg);
    }

    @ExceptionHandler(BindException.class)
    public CommonResult<?> handleBind(BindException e) {
        FieldError fe = e.getBindingResult().getFieldError();
        String msg = fe != null ? fe.getDefaultMessage() : ErrorCode.PARAM_INVALID.getMessage();
        return CommonResult.validateFailed(msg);
    }

    @ExceptionHandler(Exception.class)
    public CommonResult<?> handleException(Exception e) {
        log.error("系统异常", e);
        return CommonResult.failed("系统异常");
    }
}
