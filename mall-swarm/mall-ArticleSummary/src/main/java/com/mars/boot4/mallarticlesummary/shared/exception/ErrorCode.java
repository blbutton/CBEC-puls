package com.mars.boot4.mallarticlesummary.shared.exception;

import com.macro.mall.common.api.IErrorCode;

/**
 * 业务错误码枚举
 */
public enum ErrorCode implements IErrorCode {

    ENTITY_NOT_FOUND(4041, "实体未找到"),
    PARAM_INVALID(4042, "参数校验失败"),
    BUSINESS_ERROR(5001, "业务处理失败"),
    UNAUTHORIZED(4011, "未登录或token已过期"),
    FORBIDDEN(4031, "无相关权限");

    private final long code;
    private final String message;

    ErrorCode(long code, String message) {
        this.code = code;
        this.message = message;
    }

    @Override
    public long getCode() {
        return code;
    }

    @Override
    public String getMessage() {
        return message;
    }
}
