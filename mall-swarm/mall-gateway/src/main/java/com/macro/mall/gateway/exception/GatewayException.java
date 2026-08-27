package com.macro.mall.gateway.exception;

import com.macro.mall.common.api.ResultCode;
import lombok.Getter;

import java.io.Serial;

/**
 * 网关自定义异常
 * <p>
 *     过滤器 / 配置类中需要主动抛业务异常时使用。
 *     自带 {@link ResultCode} 便于统一错误响应。
 * </p>
 *
 * @author mall-gateway team
 */
@Getter
public class GatewayException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 业务错误码 */
    private final ResultCode code;

    public GatewayException(ResultCode code, String message) {
        super(message);
        this.code = code;
    }

    public GatewayException(ResultCode code) {
        super(code.getMessage());
        this.code = code;
    }

    public GatewayException(ResultCode code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }
}
