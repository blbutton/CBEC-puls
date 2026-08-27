package com.macro.mall.gateway.util;

import cn.hutool.core.util.StrUtil;
import org.springframework.http.server.reactive.ServerHttpRequest;

import java.net.InetSocketAddress;

/**
 * IP 工具类
 * <p>从 ServerHttpRequest 中解析真实客户端 IP，支持 X-Forwarded-For / X-Real-IP 等常用代理头。</p>
 *
 * @author mall-gateway team
 */
public final class IpUtil {

    private static final String COMMA = ",";
    private static final String UNKNOWN = "unknown";
    private static final String[] HEADERS = new String[]{
            "X-Forwarded-For",
            "X-Real-IP",
            "Proxy-Client-IP",
            "WL-Proxy-Client-IP",
            "HTTP_CLIENT_IP",
            "HTTP_X_FORWARDED_FOR"
    };

    private IpUtil() {
    }

    /**
     * 解析真实客户端 IP
     *
     * @param request 当前请求
     * @return 客户端 IP（永远非 null，无法解析时返回 "unknown"）
     */
    public static String resolveRealIp(ServerHttpRequest request) {
        if (request == null) {
            return UNKNOWN;
        }
        for (String header : HEADERS) {
            String raw = request.getHeaders().getFirst(header);
            if (isValidIp(raw)) {
                return first(raw);
            }
        }
        InetSocketAddress remote = request.getRemoteAddress();
        if (remote != null && remote.getAddress() != null) {
            return remote.getAddress().getHostAddress();
        }
        return UNKNOWN;
    }

    private static boolean isValidIp(String raw) {
        return StrUtil.isNotBlank(raw) && !UNKNOWN.equalsIgnoreCase(raw);
    }

    private static String first(String raw) {
        if (!raw.contains(COMMA)) {
            return raw.trim();
        }
        return raw.split(COMMA)[0].trim();
    }
}
