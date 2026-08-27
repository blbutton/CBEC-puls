package com.mars.boot4.mallarticlesummary.shared.web;

import com.macro.mall.common.api.CommonResult;

/**
 * 响应装配器：隔离 mall-common 的 CommonResult 构造
 */
public final class ResponseAssembler {

    private ResponseAssembler() {
    }

    public static <T> CommonResult<T> ok(T data) {
        return CommonResult.success(data);
    }

    public static CommonResult<Integer> okCount(int count) {
        return count > 0 ? CommonResult.success(count) : CommonResult.failed();
    }

    public static <T> CommonResult<T> fail() {
        return CommonResult.failed();
    }

    public static <T> CommonResult<T> fail(String message) {
        return CommonResult.failed(message);
    }
}
