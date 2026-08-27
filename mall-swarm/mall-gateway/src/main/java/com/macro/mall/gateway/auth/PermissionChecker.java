package com.macro.mall.gateway.auth;

import cn.hutool.core.convert.Convert;
import com.macro.mall.common.constant.AuthConstant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.CollectionUtils;
import org.springframework.util.PathMatcher;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 后台接口权限映射解析器
 * <p>从 Redis Hash（{@link AuthConstant#PATH_RESOURCE_MAP}）中加载路径→资源权限映射，
 * 基于 AntPath 匹配请求路径，计算出访问该接口所需的权限码列表。</p>
 * <p>
 *     <b>容错策略</b>：Redis 不可用时捕获 {@link RedisConnectionFailureException}，降级返回空列表
 *     （此时 Sa-Token 仅做登录校验，不做权限校验，保证网关在 Redis 故障时仍可转发流量）。
 * </p>
 *
 * @author mall-gateway team
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PermissionChecker {

    private final RedisTemplate<String, Object> redisTemplate;

    private final PathMatcher pathMatcher = new AntPathMatcher();

    /**
     * 解析当前请求路径所需的权限码集合（一个路径对应多个资源时，拥有任意一个即可访问）
     *
     * @param requestPath 请求 URI 路径（不含 context-path）
     * @return 需要的权限码列表；无需权限、Redis 不可用或未命中时返回空列表
     */
    public List<String> resolveRequiredPermissions(String requestPath) {
        if (requestPath == null || requestPath.isEmpty()) {
            return Collections.emptyList();
        }
        Map<Object, Object> pathResourceMap;
        try {
            pathResourceMap = redisTemplate.opsForHash().entries(AuthConstant.PATH_RESOURCE_MAP);
        } catch (RedisConnectionFailureException ex) {
            // 容错降级：Redis 挂掉时跳过权限校验（仅保留登录校验）
            log.warn("Redis 不可用，跳过权限映射解析（仅登录校验）：{}", ex.getMessage());
            return Collections.emptyList();
        } catch (Exception ex) {
            log.warn("读取 PATH_RESOURCE_MAP 失败，降级跳过权限校验：{}", ex.getMessage());
            return Collections.emptyList();
        }

        if (CollectionUtils.isEmpty(pathResourceMap)) {
            return Collections.emptyList();
        }

        List<String> needPermissionList = new ArrayList<>();
        Set<Map.Entry<Object, Object>> entrySet = pathResourceMap.entrySet();
        for (Map.Entry<Object, Object> entry : entrySet) {
            String pattern = Convert.toStr(entry.getKey());
            if (pattern != null && pathMatcher.match(pattern, requestPath)) {
                String permission = Convert.toStr(entry.getValue());
                if (permission != null && !permission.isEmpty()) {
                    needPermissionList.add(permission);
                }
            }
        }
        return needPermissionList;
    }
}
