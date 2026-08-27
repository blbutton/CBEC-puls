package com.macro.mall.gateway.domain;

import cn.hutool.json.JSONUtil;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;

/**
 * 网关访问日志领域对象
 * <p>记录每一次通过网关的请求/响应摘要信息，用于问题排查与流量分析。</p>
 *
 * @author mall-gateway team
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccessLog implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 请求到达时间 */
    private Instant timestamp;

    /** 请求追踪 ID（X-Trace-Id） */
    private String traceId;

    /** HTTP 方法（GET/POST/...） */
    private String method;

    /** 请求 URI 路径 */
    private String path;

    /** 客户端源 IP（解析 X-Forwarded-For / X-Real-IP 后） */
    private String sourceIp;

    /** 目标下游服务 ID（mall-admin / mall-portal / ...） */
    private String serviceId;

    /** HTTP 响应状态码 */
    private int status;

    /** 请求整体耗时（毫秒） */
    private long durationMs;

    /** 请求体字节数（可为 0，如 GET 请求） */
    private long requestSize;

    /** 响应体字节数 */
    private long responseSize;

    /** 当前登录用户 ID（未登录为 null） */
    private String userId;

    /**
     * 序列化为一行 JSON 字符串，用于日志输出
     *
     * @return JSON 字符串
     */
    public String toJsonLog() {
        return JSONUtil.toJsonStr(this);
    }
}
